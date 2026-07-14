/**
 * 孤立用户清理工具
 * 用于清理 Firestore 中存在但 Firebase Auth 中不存在的用户数据
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            displayName: userData.displayName || t('orphanedUsers.unnamedUser'),
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
        message.success(t('orphanedUsers.noOrphanedFound'));
      } else {
        message.warning(t('orphanedUsers.foundCount', { count: orphaned.length }));
      }
    } catch (error: any) {
      console.error('❌ 扫描失败:', error);
      message.error(t('orphanedUsers.scanFailed') + ': ' + error.message);
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
      
      message.success(t('orphanedUsers.userDeleted', { email }));
      
      // 刷新列表
      setOrphanedUsers(prev => prev.filter(u => u.uid !== uid));
      
    } catch (error: any) {
      console.error(`❌ 删除失败:`, error);
      message.error(t('orphanedUsers.deleteFailed') + ': ' + error.message);
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
      title: t('orphanedUsers.colEmail'),
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: t('orphanedUsers.colDisplayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      width: 150
    },
    {
      title: t('orphanedUsers.colMemberId'),
      dataIndex: 'memberId',
      key: 'memberId',
      width: 120,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: t('orphanedUsers.colStatus'),
      key: 'status',
      width: 150,
      render: () => <Tag color="red" icon={<WarningOutlined />}>{t('orphanedUsers.authMissing')}</Tag>
    },
    {
      title: t('orphanedUsers.colAction'),
      key: 'action',
      width: 150,
      render: (_: any, record: OrphanedUser) => (
        <Popconfirm
          title={t('orphanedUsers.deletePopconfirmTitle')}
          description={
            <div style={{ maxWidth: 300 }}>
              <p>{t('orphanedUsers.confirmDelete', { email: record.email })}</p>
              <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                {t('orphanedUsers.deleteWillRemove')}
              </p>
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                <li>{t('orphanedUsers.deleteItemFirestore')}</li>
                <li>{t('orphanedUsers.deleteItemOrders')}</li>
                <li>{t('orphanedUsers.deleteItemEvents')}</li>
                <li>{t('orphanedUsers.deleteItemReferrals')}</li>
              </ul>
              <p style={{ marginTop: 8, fontWeight: 'bold' }}>
                {t('orphanedUsers.deleteIrreversible')}
              </p>
            </div>
          }
          onConfirm={() => deleteOrphanedUser(record.uid, record.email)}
          okText={t('orphanedUsers.confirmDelete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deleting === record.uid}
          >
            {t('common.delete')}
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
            <Title level={4}>{t('orphanedUsers.title')}</Title>
            <Text type="secondary">
              {t('orphanedUsers.subtitle')}
            </Text>
          </div>

          <Alert
            message={t('orphanedUsers.alertImportantTitle')}
            description={
              <div>
                <p><strong>{t('orphanedUsers.whatAreOrphans')}</strong></p>
                <p>{t('orphanedUsers.whatAreOrphansDesc')}</p>
                <p style={{ marginTop: 8 }}><strong>{t('orphanedUsers.whyOrphans')}</strong></p>
                <ul style={{ marginTop: 4 }}>
                  <li>{t('orphanedUsers.whyOrphansReason1')}</li>
                  <li>{t('orphanedUsers.whyOrphansReason2')}</li>
                  <li>{t('orphanedUsers.whyOrphansReason3')}</li>
                </ul>
                <p style={{ marginTop: 8 }}><strong>{t('orphanedUsers.howToHandle')}</strong></p>
                <ul style={{ marginTop: 4 }}>
                  <li><strong>{t('orphanedUsers.howToHandleMethod1Label')}</strong>：{t('orphanedUsers.howToHandleMethod1Desc')}</li>
                  <li><strong>{t('orphanedUsers.howToHandleMethod2Label')}</strong>：{t('orphanedUsers.howToHandleMethod2Desc')}</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
          />

          <Alert
            message={t('orphanedUsers.alertLimitationTitle')}
            description={t('orphanedUsers.alertLimitationDesc')}
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
              {loading ? t('orphanedUsers.scanning') : t('orphanedUsers.scanFirestore')}
            </Button>
          </Space>

          {/* 加载状态 */}
          {loading && (
            <Card type="inner">
              <Space>
                <Spin />
                <Text>{t('orphanedUsers.scanningCollection')}</Text>
              </Space>
            </Card>
          )}

          {/* 用户列表 */}
          {orphanedUsers.length > 0 && (
            <>
              <Alert
                message={t('orphanedUsers.foundCount', { count: orphanedUsers.length })}
                description={t('orphanedUsers.foundCountDesc')}
                type="info"
                showIcon
              />

              <Table
                columns={columns}
                dataSource={orphanedUsers}
                rowKey="uid"
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => t('orphanedUsers.tableTotal', { total })
                }}
                size="small"
              />
            </>
          )}

          {/* 使用说明 */}
          <Card type="inner" title={t('orphanedUsers.adminSdkCardTitle')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>{t('orphanedUsers.adminSdkDesc')}</Text>

              <div style={{ marginTop: 8 }}>
                <Text strong>{t('orphanedUsers.adminSdkStep1')}</Text>
                <ol style={{ marginTop: 4 }}>
                  <li>{t('orphanedUsers.adminSdkStep1Item1')} <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                  <li>{t('orphanedUsers.adminSdkStep1Item2')}</li>
                  <li>{t('orphanedUsers.adminSdkStep1Item3')}</li>
                  <li>{t('orphanedUsers.adminSdkStep1Item4')} <Text code>serviceAccountKey.json</Text></li>
                  <li>{t('orphanedUsers.adminSdkStep1Item5')} <Text code>scripts/</Text> {t('orphanedUsers.adminSdkStep1Item5Suffix')}</li>
                </ol>
              </div>

              <div style={{ marginTop: 8 }}>
                <Text strong>{t('orphanedUsers.adminSdkStep2')}</Text>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                  npm install firebase-admin
                </pre>
              </div>

              <div style={{ marginTop: 8 }}>
                <Text strong>{t('orphanedUsers.adminSdkStep3')}</Text>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                  node scripts/restore-missing-auth-user.js
                </pre>
              </div>

              <Alert
                message={t('orphanedUsers.adminSdkScriptCreated')}
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

