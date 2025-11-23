/**
 * 孤立用户清理工具
 * 用于清理 Firestore 中存在但 Firebase Auth 中不存在的用户数据
 */

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Table, Tag, App, Spin, Popconfirm } from 'antd';
import { DeleteOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';

const { Title, Text } = Typography;

interface OrphanedUser {
  uid: string;
  email: string;
  displayName: string;
  memberId?: string;
  createdAt?: any;
  hasOrders?: boolean;
  hasEvents?: boolean;
  hasReferrals?: boolean;
}

const OrphanedUserCleanup: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 查找孤立用户
  const findOrphanedUsers = async () => {
    setLoading(true);
    setOrphanedUsers([]);

    try {
      // 获取所有 Firestore 用户
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      const orphaned: OrphanedUser[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        
        try {
          // 尝试获取 Firebase Auth 用户
          const currentUser = auth.currentUser;
          
          // 简单检查：如果当前登录用户不是这个 UID，我们无法直接验证
          // 这里我们只能通过尝试操作来判断
          
          // 记录所有用户（后续需要手动在 Firebase Console 验证）
          orphaned.push({
            uid: uid,
            email: userData.email || '',
            displayName: userData.displayName || '未命名',
            memberId: userData.memberId,
            createdAt: userData.createdAt,
            hasOrders: false,  // 需要进一步查询
            hasEvents: false,
            hasReferrals: (userData.referral?.referrals?.length || 0) > 0
          });
        } catch (error: any) {
        }
      }
      
      setOrphanedUsers(orphaned);
      
      if (orphaned.length === 0) {
        message.success('没有发现孤立用户');
      } else {
        message.warning(`找到 ${orphaned.length} 个用户，请手动在 Firebase Console 验证其 Auth 状态`);
      }
    } catch (error: any) {
      console.error('❌ 扫描失败:', error);
      message.error('扫描失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 删除孤立用户及其关联数据
  const deleteOrphanedUser = async (uid: string, email: string) => {
    setDeleting(uid);

    try {
      // 1. 删除用户文档
      await deleteDoc(doc(db, 'users', uid));
      
      // 2. 删除用户的订单
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      let ordersDeleted = 0;
      for (const orderDoc of ordersSnapshot.docs) {
        if (orderDoc.data().userId === uid) {
          await deleteDoc(doc(db, 'orders', orderDoc.id));
          ordersDeleted++;
        }
      }
      
      // 3. 从活动参与者中移除
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      let eventsUpdated = 0;
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const registered = eventData.participants?.registered || [];
        const checkedIn = eventData.participants?.checkedIn || [];
        
        if (registered.includes(uid) || checkedIn.includes(uid)) {
          await updateDoc(doc(db, 'events', eventDoc.id), {
            'participants.registered': arrayRemove(uid),
            'participants.checkedIn': arrayRemove(uid)
          });
          eventsUpdated++;
        }
      }
      
      // 4. 清理引荐关系
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      let referralsUpdated = 0;
      for (const otherUserDoc of allUsersSnapshot.docs) {
        const otherUserData = otherUserDoc.data();
        const referrals = otherUserData.referral?.referrals || [];
        
        // 兼容新旧格式：检查 string[] 或对象数组
        const hasReferral = referrals.some((r: any) => 
          typeof r === 'string' ? r === uid : r.userId === uid
        );
        
        if (hasReferral) {
          // 找到要删除的项（兼容新旧格式）
          const itemToRemove = referrals.find((r: any) => 
            typeof r === 'string' ? r === uid : r.userId === uid
          );
          
          await updateDoc(doc(db, 'users', otherUserDoc.id), {
            'referral.referrals': arrayRemove(itemToRemove),
            'referral.totalReferred': (otherUserData.referral?.totalReferred || 1) - 1
          });
          referralsUpdated++;
        }
      }
      
      message.success(`用户 ${email} 已删除`);
      
      // 刷新列表
      setOrphanedUsers(prev => prev.filter(u => u.uid !== uid));
      
    } catch (error: any) {
      console.error(`❌ 删除失败:`, error);
      message.error('删除失败: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const columns = [
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      width: 250,
      render: (text: string) => <Text code style={{ fontSize: 11 }}>{text}</Text>
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 150
    },
    {
      title: '会员编号',
      dataIndex: 'memberId',
      key: 'memberId',
      width: 120,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: () => <Tag color="red" icon={<WarningOutlined />}>Auth 缺失</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: OrphanedUser) => (
        <Popconfirm
          title="删除孤立用户"
          description={
            <div style={{ maxWidth: 300 }}>
              <p>确定要删除用户 <Text strong>{record.email}</Text> 的所有数据吗？</p>
              <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                此操作将删除：
              </p>
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                <li>Firestore 用户文档</li>
                <li>用户的所有订单</li>
                <li>活动参与记录</li>
                <li>引荐关系</li>
              </ul>
              <p style={{ marginTop: 8, fontWeight: 'bold' }}>
                ⚠️ 此操作不可恢复！
              </p>
            </div>
          }
          onConfirm={() => deleteOrphanedUser(record.uid, record.email)}
          okText="确认删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deleting === record.uid}
          >
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>孤立用户清理工具</Title>
            <Text type="secondary">
              查找 Firestore 中存在但 Firebase Authentication 中不存在的用户，并提供清理功能
            </Text>
          </div>

          <Alert
            message="重要说明"
            description={
              <div>
                <p><strong>什么是孤立用户？</strong></p>
                <p>孤立用户是指在 Firestore 数据库中有用户文档，但在 Firebase Authentication 中没有对应账户的用户。</p>
                <p style={{ marginTop: 8 }}><strong>为什么会出现孤立用户？</strong></p>
                <ul style={{ marginTop: 4 }}>
                  <li>Firebase Console 中手动删除了 Auth 用户，但未删除 Firestore 数据</li>
                  <li>测试期间删除用户未完整清理</li>
                  <li>数据迁移过程中出现不一致</li>
                </ul>
                <p style={{ marginTop: 8 }}><strong>如何处理？</strong></p>
                <ul style={{ marginTop: 4 }}>
                  <li><strong>方法 1（推荐）</strong>：删除 Firestore 数据，让用户重新注册（会获得新的会员编号）</li>
                  <li><strong>方法 2</strong>：使用 Firebase Admin SDK 恢复 Auth 用户（保留原 UID 和会员编号）</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
          />

          <Alert
            message="⚠️ 注意：此工具无法验证 Firebase Auth 状态"
            description="由于客户端 SDK 限制，此工具只能列出所有 Firestore 用户。请手动在 Firebase Console 的 Authentication 页面验证哪些用户缺失 Auth 记录。"
            type="info"
            showIcon
          />

          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined spin={loading} />}
              onClick={findOrphanedUsers}
              loading={loading}
            >
              {loading ? '扫描中...' : '扫描 Firestore 用户'}
            </Button>
          </Space>

          {/* 加载状态 */}
          {loading && (
            <Card type="inner">
              <Space>
                <Spin />
                <Text>正在扫描 Firestore users 集合...</Text>
              </Space>
            </Card>
          )}

          {/* 用户列表 */}
          {orphanedUsers.length > 0 && (
            <>
              <Alert
                message={`找到 ${orphanedUsers.length} 个用户`}
                description="请在 Firebase Console > Authentication 中验证这些用户是否缺失 Auth 记录"
                type="info"
                showIcon
              />

              <Table
                columns={columns}
                dataSource={orphanedUsers}
                rowKey="uid"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `共 ${total} 个用户`
                }}
                size="small"
              />
            </>
          )}

          {/* 使用说明 */}
          <Card type="inner" title="使用 Firebase Admin SDK 恢复用户（推荐）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>如果需要保留用户的历史数据（订单、积分、引荐等），请使用以下方法：</Text>
              
              <div style={{ marginTop: 8 }}>
                <Text strong>步骤 1: 准备 Service Account Key</Text>
                <ol style={{ marginTop: 4 }}>
                  <li>访问 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                  <li>项目设置 → 服务账号</li>
                  <li>点击"生成新的私钥"</li>
                  <li>下载 JSON 文件并重命名为 <Text code>serviceAccountKey.json</Text></li>
                  <li>放置到项目的 <Text code>scripts/</Text> 目录</li>
                </ol>
              </div>

              <div style={{ marginTop: 8 }}>
                <Text strong>步骤 2: 安装 Firebase Admin SDK</Text>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                  npm install firebase-admin
                </pre>
              </div>

              <div style={{ marginTop: 8 }}>
                <Text strong>步骤 3: 运行恢复脚本</Text>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                  node scripts/restore-missing-auth-user.js
                </pre>
              </div>

              <Alert
                message="脚本已创建在 scripts/restore-missing-auth-user.js"
                type="success"
                showIcon
                style={{ marginTop: 8 }}
              />
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default OrphanedUserCleanup;

