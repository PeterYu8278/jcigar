/**
 * Firebase Cloud Functions
 * 推送通知服务
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * 发送推送通知（HTTP Callable 函数）
 * 前端可以调用此函数发送通知
 * 
 * Spark 计划优化：
 * - 内存：256MB（默认，足够使用）
 * - 超时：60秒（默认，足够发送通知）
 * - 并发：适合中小型应用
 * 
 * @example
 * ```typescript
 * const sendNotification = httpsCallable(functions, 'sendNotification');
 * await sendNotification({
 *   tokens: ['token1', 'token2'],
 *   notification: { title: 'Test', body: 'Message' },
 *   data: { type: 'system' },
 *   priority: 'normal'
 * });
 * ```
 */
export const sendNotification = functions
    .runWith({
      timeoutSeconds: 60, // Spark 计划最大 60 秒
      memory: "256MB", // Spark 计划默认内存
    })
    .https.onCall(async (data, context) => {
      // 验证用户已登录
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated"
        );
      }

      const {tokens, notification, data: notificationData, priority} = data;

      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Tokens array is required and cannot be empty"
        );
      }

      if (!notification || !notification.title || !notification.body) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Notification title and body are required"
        );
      }

      try {
        // 准备消息数据（Firebase 要求所有 data 字段都是字符串）
        const dataPayload: Record<string, string> = {};
        if (notificationData) {
          Object.keys(notificationData).forEach((key) => {
            dataPayload[key] = String(notificationData[key]);
          });
        }

        // 创建推送消息
        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: notification.title,
            body: notification.body,
            ...(notification.icon && {imageUrl: notification.icon}),
            ...(notification.image && {imageUrl: notification.image}),
          },
          data: dataPayload,
          apns: {
            headers: {
              "apns-priority": priority === "high" ? "10" : "5",
            },
          },
          android: {
            priority: priority === "high" ? "high" : "normal",
          },
          webpush: {
            notification: {
              ...notification,
              requireInteraction: priority === "high",
              icon: notification.icon || "/icons/icon-192x192.png",
            },
            fcmOptions: {
              link: notificationData?.url || "/",
            },
          },
        };

        // 发送推送通知
        const response = await admin.messaging().sendMulticast(message);

        // 处理失败的令牌
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(
                `Failed to send notification to token ${tokens[idx]}:`,
                resp.error
            );

            // 如果是无效令牌错误，标记为失效
            if (
              resp.error?.code === "messaging/invalid-registration-token" ||
              resp.error?.code === "messaging/registration-token-not-registered"
            ) {
              markTokenAsInactive(tokens[idx]);
            }
          }
        });

        console.log(
            `Notification sent: ${response.successCount} successful, ` +
            `${response.failureCount} failed`
        );

        return {
          success: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
          failedTokens,
        };
      } catch (error: any) {
        console.error("Error sending notification:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to send notification",
            error.message
        );
      }
    }
);

/**
 * 标记设备令牌为失效
 */
async function markTokenAsInactive(token: string): Promise<void> {
  try {
    const tokensSnapshot = await admin
        .firestore()
        .collection("deviceTokens")
        .where("token", "==", token)
        .get();

    const batch = admin.firestore().batch();
    tokensSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (tokensSnapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Marked ${tokensSnapshot.docs.length} token(s) as inactive`);
    }
  } catch (error) {
    console.error("Error marking token as inactive:", error);
  }
}

/**
 * 充值验证后自动发送通知（Firestore 触发器）
 * 监听 reloadRecords 集合的变化，当状态从 pending 变为 completed 时发送通知
 * 
 * Spark 计划优化：
 * - 超时：60秒（默认，足够发送通知）
 * - 内存：256MB（默认）
 * - 触发限制：Spark 计划支持 Firestore 触发器
 */
export const onReloadVerified = functions
    .runWith({
      timeoutSeconds: 60,
      memory: "256MB",
    })
    .firestore.document("reloadRecords/{recordId}")
    .onUpdate(async (change, context) => {
      const newData = change.after.data();
      const oldData = change.before.data();

      // 检查状态是否从 pending 变为 completed
      if (oldData.status === "pending" && newData.status === "completed") {
        const userId = newData.userId;
        const recordId = context.params.recordId;

        console.log(
            `[onReloadVerified] Reload record ${recordId} verified for user ${userId}`
        );

        try {
          // 获取用户信息
          const userDoc = await admin.firestore().doc(`users/${userId}`).get();
          if (!userDoc.exists) {
            console.error(`[onReloadVerified] User ${userId} not found`);
            return;
          }

          const userData = userDoc.data();

          // 检查用户是否启用了推送通知
          const pushEnabled = userData?.notifications?.pushEnabled;
          if (pushEnabled === false) {
            console.log(
                `[onReloadVerified] User ${userId} has push notifications disabled`
            );
            return;
          }

          // 检查用户偏好
          const preferences = userData?.notifications?.preferences;
          if (preferences?.reloadVerified === false) {
            console.log(
                `[onReloadVerified] User ${userId} has reload verification ` +
                "notifications disabled"
            );
            return;
          }

          // 获取用户的设备令牌
          const tokensSnapshot = await admin
              .firestore()
              .collection("deviceTokens")
              .where("userId", "==", userId)
              .where("isActive", "==", true)
              .get();

          if (tokensSnapshot.empty) {
            console.log(
                `[onReloadVerified] User ${userId} has no active device tokens`
            );
            return;
          }

          const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

          // 准备通知数据
          const requestedAmount = newData.requestedAmount || 0;
          const pointsEquivalent = newData.pointsEquivalent || 0;

          const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
              title: "💰 充值成功",
              body: `您的充值 ${requestedAmount} RM (${pointsEquivalent} 积分) 已到账`,
            },
            data: {
              type: "reload_verified",
              recordId,
              userId,
              url: "/profile",
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
            },
            android: {
              priority: "high",
            },
            webpush: {
              notification: {
                title: "💰 充值成功",
                body: `您的充值 ${requestedAmount} RM (${pointsEquivalent} 积分) 已到账`,
                icon: "/icons/money-bag.png",
                requireInteraction: true,
              },
              fcmOptions: {
                link: "/profile",
              },
            },
          };

          const response = await admin.messaging().sendMulticast(message);
          console.log(
              "[onReloadVerified] Sent reload notification: " +
              `${response.successCount} successful, ${response.failureCount} failed`
          );

          // 处理失败的令牌
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const token = tokens[idx];
              console.error(
                  `[onReloadVerified] Failed to send to token ${token}:`,
                  resp.error
              );

              if (
                resp.error?.code === "messaging/invalid-registration-token" ||
                resp.error?.code === "messaging/registration-token-not-registered"
              ) {
                markTokenAsInactive(token);
              }
            }
          });
        } catch (error: any) {
          console.error("[onReloadVerified] Error:", error);
        }
      }
    });

/**
 * 活动提醒（定时任务）
 * 每天检查即将开始的活动并发送提醒
 * 运行时间：每天上午 9 点（Asia/Kuala_Lumpur 时区）
 * 
 * Spark 计划优化：
 * - 超时：540秒（9分钟，Spark 计划最大超时）
 * - 内存：256MB（默认）
 * - 批量处理：限制每批处理的用户数量，避免超时
 */
export const sendEventReminders = functions
    .runWith({
      timeoutSeconds: 540, // Spark 计划最大超时（9分钟）
      memory: "256MB",
    })
    .pubsub.schedule("0 9 * * *") // 每天上午 9 点
    .timeZone("Asia/Kuala_Lumpur")
    .onRun(async () => {
      console.log("[sendEventReminders] Starting event reminder check");

      const now = admin.firestore.Timestamp.now();
      const tomorrow = new Date(now.toMillis());
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimestamp = admin.firestore.Timestamp.fromDate(tomorrow);

      try {
        // 查询明天开始的活动
        const eventsSnapshot = await admin
            .firestore()
            .collection("events")
            .where("status", "==", "published")
            .where("startDate", ">=", now)
            .where("startDate", "<=", tomorrowTimestamp)
            .get();

        if (eventsSnapshot.empty) {
          console.log("[sendEventReminders] No events starting tomorrow");
          return null;
        }

        console.log(
            `[sendEventReminders] Found ${eventsSnapshot.size} events starting tomorrow`
        );

        // 对每个活动发送提醒给报名用户
        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data();
          const eventId = eventDoc.id;

          // 获取活动参与者
          const participants = eventData.participants || [];

          if (participants.length === 0) {
            console.log(
                `[sendEventReminders] Event ${eventId} has no participants`
            );
            continue;
          }

          console.log(
              `[sendEventReminders] Sending reminders for event ${eventId} ` +
              `to ${participants.length} participants`
          );

          // 批量获取用户信息（限制并发，Spark 计划优化）
          // 每批处理 50 个用户，避免超时和内存问题
          const BATCH_SIZE = 50;
          const participantBatches = [];
          
          for (let i = 0; i < participants.length; i += BATCH_SIZE) {
            participantBatches.push(participants.slice(i, i + BATCH_SIZE));
          }

          // 分批处理，避免一次性处理太多用户导致超时
          for (const batch of participantBatches) {
            const userPromises = batch.map((userId: string) =>
              admin.firestore().doc(`users/${userId}`).get()
            );

            const userDocs = await Promise.all(userPromises);

            for (const userDoc of userDocs) {
            if (!userDoc.exists) continue;

            const userData = userDoc.data();
            const userId = userDoc.id;

            // 检查用户偏好
            if (userData?.notifications?.preferences?.eventReminders === false) {
              continue;
            }

            // 获取设备令牌
            const tokensSnapshot = await admin
                .firestore()
                .collection("deviceTokens")
                .where("userId", "==", userId)
                .where("isActive", "==", true)
                .get();

            if (tokensSnapshot.empty) continue;

            const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

            const message: admin.messaging.MulticastMessage = {
              tokens,
              notification: {
                title: "🎉 活动提醒",
                body: `${eventData.title || "活动"} 将于明天开始`,
              },
              data: {
                type: "event_reminder",
                eventId,
                url: `/events/${eventId}`,
              },
              webpush: {
                notification: {
                  title: "🎉 活动提醒",
                  body: `${eventData.title || "活动"} 将于明天开始`,
                  icon: "/icons/event.png",
                },
                fcmOptions: {
                  link: `/events/${eventId}`,
                },
              },
            };

            try {
              await admin.messaging().sendMulticast(message);
            } catch (error) {
              console.error(
                  `[sendEventReminders] Error sending to user ${userId}:`,
                  error
              );
            }
            } // 结束 userDoc 循环
          } // 结束 batch 循环
        }

        console.log(
            `[sendEventReminders] Completed processing ${eventsSnapshot.size} events`
        );
        return null;
      } catch (error: any) {
        console.error("[sendEventReminders] Error:", error);
        return null;
      }
    });

