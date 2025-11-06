/**
 * Authentication & Firestore 同步诊断工具
 * 用于检测和修复 Firebase Auth 和 Firestore 之间的数据不一致
 */

import React, { useState } from 'react';
import { Card, Button, Table, Typography, Space, Alert, Tag, message, Modal, Input, Form } from 'antd';
import { SyncOutlined, WarningOutlined, CheckCircleOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const { Title, Text, Paragraph } = Typography;

interface SyncIssue {
  type: 'missing-auth' | 'missing-firestore' | 'uid-mismatch';
  email: string;
  firestoreUid?: string;
  authUid?: string;
  severity: 'critical' | 'warning';
  action: string;
}

const AuthFirestoreSync: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<SyncIssue[]>([]);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<SyncIssue | null>(null);
  const [form] = Form.useForm();

  /**
   * 扫描 Authentication 和 Firestore 的同步问题
   */
  const scanSyncIssues = async () => {
    setLoading(true);
    setIssues([]);

    try {
      // 1. 获取所有 Firestore 用户
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const firestoreUsers = new Map<string, any>();
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        firestoreUsers.set(doc.id, {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
        });
      });

      // 2. 获取所有 Authentication 用户
      // 注意：客户端无法直接列出所有 Auth 用户，需要手动输入或使用 Admin SDK
      message.warning('客户端无法直接访问所有 Authentication 用户。请在 Firebase Console 中手动检查。');
      
      // 3. 检查 Firestore 孤儿用户（在 Firestore 存在但 Auth 不存在）
      const foundIssues: SyncIssue[] = [];
      
      // 这里需要手动检查已知的问题用户
      const knownIssues = [
        {
          email: 'wloong8278@gmail.com',
          firestoreUid: '3qENcjaJpQNzn7Y98oZJQWNAdSm1',
          authUid: undefined, // 在 Auth 中不存在
        },
        {
          email: 'admin2@jep.com',
          firestoreUid: 'yNRzwxsqkkP0nvYFCzsDnZMtVE52',
          authUid: 'yNRzwxsqkkP0nvYFCzsDnZMt', // UID 不匹配
        }
      ];

      for (const issue of knownIssues) {
        const firestoreDoc = await getDoc(doc(db, 'users', issue.firestoreUid!));
        
        if (firestoreDoc.exists()) {
          if (!issue.authUid) {
            foundIssues.push({
              type: 'missing-auth',
              email: issue.email,
              firestoreUid: issue.firestoreUid,
              severity: 'critical',
              action: '创建新的 Authentication 用户并迁移数据',
            });
          } else if (issue.authUid !== issue.firestoreUid) {
            foundIssues.push({
              type: 'uid-mismatch',
              email: issue.email,
              firestoreUid: issue.firestoreUid,
              authUid: issue.authUid,
              severity: 'critical',
              action: '迁移 Firestore 数据到正确的 UID',
            });
          }
        }
      }

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        message.success('未发现同步问题！');
      } else {
        message.warning(`发现 ${foundIssues.length} 个同步问题`);
      }
    } catch (error: any) {
      message.error('扫描失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理：为 Firestore 孤儿用户创建 Authentication 账户
   */
  const handleCreateAuthUser = (issue: SyncIssue) => {
    setSelectedIssue(issue);
    setCreateUserModal(true);
    form.setFieldsValue({
      email: issue.email,
      password: '',
    });
  };

  /**
   * 创建 Authentication 用户
   */
  const createAuthUser = async (values: any) => {
    if (!selectedIssue) return;

    try {
      // 创建新的 Authentication 用户
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      const newUid = userCredential.user.uid;
      
      message.success(`创建成功！新 UID: ${newUid}`);
      
      // 提示用户下一步操作
      Modal.info({
        title: '下一步操作',
        content: (
          <div>
            <p><strong>新 UID:</strong> <Text code>{newUid}</Text></p>
            <p><strong>旧 UID:</strong> <Text code>{selectedIssue.firestoreUid}</Text></p>
            <br />
            <Alert
              type="warning"
              message="需要手动操作"
              description={
                <div>
                  <p>1. 请使用 <strong>用户迁移工具</strong> 将数据从旧 UID 迁移到新 UID</p>
                  <p>2. 迁移完成后，删除旧的 Firestore 文档</p>
                </div>
              }
            />
          </div>
        ),
      });
      
      setCreateUserModal(false);
      scanSyncIssues(); // 重新扫描
    } catch (error: any) {
      message.error('创建失败: ' + error.message);
    }
  };

  /**
   * 处理：删除 Firestore 孤儿数据
   */
  const handleDeleteFirestoreOrphan = async (issue: SyncIssue) => {
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除 Firestore 中的孤儿用户数据吗？</p>
          <p><strong>Email:</strong> {issue.email}</p>
          <p><strong>UID:</strong> <Text code>{issue.firestoreUid}</Text></p>
          <Alert
            type="error"
            message="警告"
            description="删除后无法恢复！建议先导出数据备份。"
            style={{ marginTop: 16 }}
          />
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteDoc(doc(db, 'users', issue.firestoreUid!));
          message.success('删除成功');
          scanSyncIssues(); // 重新扫描
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const columns = [
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config = {
          'missing-auth': { color: 'red', text: 'Authentication 缺失' },
          'missing-firestore': { color: 'orange', text: 'Firestore 缺失' },
          'uid-mismatch': { color: 'purple', text: 'UID 不匹配' },
        }[type] || { color: 'gray', text: type };
        
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={severity === 'critical' ? 'red' : 'orange'}>
          {severity === 'critical' ? '严重' : '警告'}
        </Tag>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Firestore UID',
      dataIndex: 'firestoreUid',
      key: 'firestoreUid',
      render: (uid?: string) => uid ? <Text code>{uid}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Auth UID',
      dataIndex: 'authUid',
      key: 'authUid',
      render: (uid?: string) => uid ? <Text code>{uid}</Text> : <Text type="danger">不存在</Text>,
    },
    {
      title: '建议操作',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: SyncIssue) => (
        <Space>
          {record.type === 'missing-auth' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => handleCreateAuthUser(record)}
              >
                创建 Auth 用户
              </Button>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteFirestoreOrphan(record)}
              >
                删除孤儿数据
              </Button>
            </>
          )}
          {record.type === 'uid-mismatch' && (
            <Button type="link" size="small">
              需要手动修复
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>
              <SyncOutlined /> Authentication & Firestore 同步诊断
            </Title>
            <Paragraph type="secondary">
              检测 Firebase Authentication 和 Firestore 之间的数据不一致问题
            </Paragraph>
          </div>

          <Alert
            type="info"
            message="使用说明"
            description={
              <ul>
                <li>此工具用于检测和修复 Firebase Auth 和 Firestore 用户数据的不一致</li>
                <li>常见问题：Firestore 有用户但 Auth 没有（孤儿数据）</li>
                <li>修复前请先备份数据</li>
              </ul>
            }
          />

          <Button
            type="primary"
            icon={<SyncOutlined spin={loading} />}
            onClick={scanSyncIssues}
            loading={loading}
            size="large"
          >
            扫描同步问题
          </Button>

          {issues.length > 0 && (
            <>
              <Alert
                type="warning"
                message={`发现 ${issues.length} 个问题`}
                description="请根据建议操作进行修复"
                showIcon
                icon={<WarningOutlined />}
              />

              <Table
                columns={columns}
                dataSource={issues}
                rowKey={(record) => `${record.email}-${record.type}`}
                pagination={false}
              />
            </>
          )}

          {issues.length === 0 && !loading && (
            <Alert
              type="success"
              message="暂无问题"
              description='点击"扫描同步问题"开始检查'
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}
        </Space>
      </Card>

      {/* 创建 Authentication 用户 Modal */}
      <Modal
        title="创建 Authentication 用户"
        open={createUserModal}
        onCancel={() => setCreateUserModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createAuthUser}
        >
          <Alert
            type="info"
            message="创建新的 Authentication 账户"
            description={`为 ${selectedIssue?.email} 创建新的登录凭据。创建后需要手动迁移 Firestore 数据。`}
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="邮箱"
            name="email"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            label="临时密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="设置临时密码（至少6位）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setCreateUserModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AuthFirestoreSync;

