// 充值验证组件
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, message, Upload, Image, Select, Spin } from 'antd';
import { CheckOutlined, CloseOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import { getAllReloadRecords, verifyReloadRecord, rejectReloadRecord } from '../../services/firebase/reload';
import { processPendingMembershipFees } from '../../services/firebase/scheduledJobs';
import type { ReloadRecord } from '../../types';
import dayjs from 'dayjs';
import { uploadFile } from '../../services/cloudinary/create';

interface ReloadVerificationProps {
  onRefresh?: () => void;
}

export const ReloadVerification: React.FC<ReloadVerificationProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ReloadRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ReloadRecord | null>(null);
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string>('');
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  useEffect(() => {
    loadRecords();
  }, [statusFilter]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const allRecords = await getAllReloadRecords(filter, 100);
      setRecords(allRecords);
      if (allRecords.length === 0) {
        if (statusFilter === 'pending') {
          message.info('暂无待验证的充值记录');
        } else {
          message.info('暂无充值记录');
        }
      }
    } catch (error: any) {
      console.error('[ReloadVerification] 加载充值记录失败:', error);
      message.error('加载充值记录失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (record: ReloadRecord) => {
    setCurrentRecord(record);
    setVerifyModalVisible(true);
    form.resetFields();
    setProofUrl('');
  };

  const handleReject = (record: ReloadRecord) => {
    setCurrentRecord(record);
    setRejectModalVisible(true);
    rejectForm.resetFields();
  };

  const onVerifySubmit = async (values: any) => {
    if (!currentRecord) return;

    setUploading(true);
    try {
      let finalProofUrl = proofUrl;
      
      // 如果有上传的文件，先上传到Cloudinary
      if (values.proof && values.proof.fileList && values.proof.fileList.length > 0) {
        const file = values.proof.fileList[0].originFileObj;
        if (file) {
          const uploadResult = await uploadFile(file, { 
            folder: 'jep-cigar/reload-proofs',
            resourceType: 'image'
          });
          if (uploadResult.secure_url || uploadResult.url) {
            finalProofUrl = uploadResult.secure_url || uploadResult.url || '';
          }
        }
      }

      const result = await verifyReloadRecord(
        currentRecord.id,
        'admin', // TODO: 使用实际的管理员ID
        finalProofUrl || undefined,
        values.notes
      );

      if (result.success) {
        message.success('充值验证成功');
        setVerifyModalVisible(false);
        form.resetFields();
        setProofUrl('');
        loadRecords();
        onRefresh?.();
        
        // 充值验证成功后，自动检查并扣除年费
        try {
          const deductionResult = await processPendingMembershipFees();
          if (deductionResult.success && deductionResult.processed > 0) {
            // 静默执行，不显示消息
          }
        } catch (error: any) {
          console.error('[ReloadVerification] 充值后自动扣除年费失败:', error);
          // 静默失败，不显示错误消息
        }
      } else {
        message.error(result.error || '验证失败');
      }
    } catch (error: any) {
      message.error(error.message || '验证失败');
    } finally {
      setUploading(false);
    }
  };

  const onRejectSubmit = async (values: any) => {
    if (!currentRecord) return;

    try {
      const result = await rejectReloadRecord(
        currentRecord.id,
        'admin', // TODO: 使用实际的管理员ID
        values.notes
      );

      if (result.success) {
        message.success('已拒绝充值请求');
        setRejectModalVisible(false);
        rejectForm.resetFields();
        loadRecords();
        onRefresh?.();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string, record: ReloadRecord) => name || record.userId
    },
    {
      title: '充值金额',
      dataIndex: 'requestedAmount',
      key: 'requestedAmount',
      width: 120,
      render: (amount: number, record: ReloadRecord) => (
        <div>
          <div>{amount} RM</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            = {record.pointsEquivalent} 积分
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待验证' },
          completed: { color: 'green', text: '已完成' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '凭证',
      dataIndex: 'verificationProof',
      key: 'verificationProof',
      width: 100,
      render: (proof: string) => {
        if (!proof) return '-';
        return (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
              title: <span style={{ color: '#FFFFFF' }}>充值凭证</span>,
                content: <Image src={proof} alt="充值凭证" style={{ maxWidth: '100%' }} />,
              width: 600,
              styles: {
                content: {
                  background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
                  border: '1px solid rgba(244, 175, 37, 0.6)'
                },
                header: {
                  background: 'transparent',
                  borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
                },
                body: {
                  background: 'transparent'
                }
              },
              okButtonProps: {
                style: {
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700
                }
              }
              });
            }}
          style={{
            color: '#FFD700',
            padding: 0
          }}
          >
            查看
          </Button>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: ReloadRecord) => (
        <Space>
          <Button
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleVerify(record)}
            disabled={record.status !== 'pending'}
            style={{
              background: record.status === 'pending' 
                ? 'linear-gradient(to right, #FDE08D, #C48D3A)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: record.status === 'pending' ? '#111' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: 700
            }}
          >
            验证
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReject(record)}
            disabled={record.status !== 'pending'}
            style={{
              background: record.status === 'pending' 
                ? 'rgba(255, 77, 79, 0.8)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: record.status === 'pending' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: 700
            }}
          >
            拒绝
          </Button>
        </Space>
      )
    }
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          style={{ width: 150 }}
          options={[
            { label: '全部', value: 'all' },
            { label: '待验证', value: 'pending' },
            { label: '已完成', value: 'completed' },
            { label: '已拒绝', value: 'rejected' }
          ]}
          className="points-config-form"
        />
        <Button 
          onClick={loadRecords} 
          loading={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }}
        >
          刷新
        </Button>
      </div>
      {!isMobile ? (
        <div className="points-config-form">
      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true
        }}
            style={{
              background: 'transparent'
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
              <Spin />
            </div>
          ) : records.length === 0 ? (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>
              暂无充值记录
            </div>
          ) : (
            records.map((record) => {
              const statusMap: Record<string, { color: string; text: string }> = {
                pending: { color: '#fb923c', text: '待验证' },
                completed: { color: '#34d399', text: '已完成' },
                rejected: { color: '#f87171', text: '已拒绝' }
              };
              const statusInfo = statusMap[record.status] || { color: '#9ca3af', text: record.status };

              const createdDate = record.createdAt instanceof Date
                ? record.createdAt
                : (record.createdAt as any)?.toDate
                  ? (record.createdAt as any).toDate()
                  : new Date(record.createdAt);

              return (
                <div
                  key={record.id}
                  style={{
                    border: '1px solid rgba(244,175,37,0.2)',
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(34,28,16,0.5)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                        {record.userName || record.userId.substring(0, 20)}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                        {dayjs(createdDate).format('YYYY-MM-DD HH:mm')}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                        {record.requestedAmount} RM = {record.pointsEquivalent} 积分
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 12 }}>
                      <div style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: statusInfo.color === '#fb923c' ? 'rgba(251,146,60,0.2)' :
                          statusInfo.color === '#34d399' ? 'rgba(52,211,153,0.2)' :
                          'rgba(248,113,113,0.2)',
                        color: statusInfo.color,
                        fontWeight: 600,
                        marginBottom: 8
                      }}>
                        {statusInfo.text}
                      </div>
                      {record.verificationProof && (
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          size="small"
                          onClick={() => {
                            Modal.info({
                              title: <span style={{ color: '#FFFFFF' }}>充值凭证</span>,
                              content: <Image src={record.verificationProof!} alt="充值凭证" style={{ maxWidth: '100%' }} />,
                              width: isMobile ? '90%' : 600,
                              styles: {
                                content: {
                                  background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
                                  border: '1px solid rgba(244, 175, 37, 0.6)'
                                },
                                header: {
                                  background: 'transparent',
                                  borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
                                },
                                body: {
                                  background: 'transparent'
                                }
                              },
                              okButtonProps: {
                                style: {
                                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                                  border: 'none',
                                  color: '#111',
                                  fontWeight: 700
                                }
                              }
                            });
                          }}
                          style={{
                            color: '#FFD700',
                            padding: 0,
                            fontSize: 11
                          }}
                        >
                          查看凭证
                        </Button>
                      )}
                    </div>
                  </div>
                  {record.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(244,175,37,0.1)' }}>
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleVerify(record)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                          border: 'none',
                          color: '#111',
                          fontWeight: 700
                        }}
                      >
                        验证
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => handleReject(record)}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 77, 79, 0.8)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontWeight: 700
                        }}
                      >
                        拒绝
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 验证模态框 */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>验证充值</span>}
        open={verifyModalVisible}
        onCancel={() => {
          setVerifyModalVisible(false);
          form.resetFields();
          setProofUrl('');
        }}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        width={600}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
      >
        {currentRecord && (
          <Form
            form={form}
            layout="vertical"
            onFinish={onVerifySubmit}
            className="points-config-form"
          >
            <div style={{ marginBottom: 16, color: 'rgba(255, 255, 255, 0.85)' }}>
              <div style={{ marginBottom: 8 }}>用户: {currentRecord.userName || currentRecord.userId}</div>
              <div style={{ marginBottom: 8 }}>充值金额: {currentRecord.requestedAmount} RM</div>
              <div>对应积分: {currentRecord.pointsEquivalent} 积分</div>
            </div>

            <Form.Item
              name="proof"
              label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>上传充值凭证（可选）</span>}
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
                onChange={(info) => {
                  if (info.fileList.length > 0 && info.fileList[0].originFileObj) {
                    const file = info.fileList[0].originFileObj;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setProofUrl(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setProofUrl('');
                  }
                }}
              >
                <div>
                  <UploadOutlined style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                  <div style={{ marginTop: 8, color: 'rgba(255, 255, 255, 0.85)' }}>上传</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item
              name="notes"
              label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>备注（可选）</span>}
            >
              <Input.TextArea 
                rows={4} 
                placeholder="输入验证备注..." 
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 拒绝模态框 */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>拒绝充值</span>}
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        okButtonProps={{ 
          danger: true,
          style: {
            background: '#ff4d4f',
            border: 'none',
            color: '#FFFFFF',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        width={500}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
      >
        {currentRecord && (
          <Form
            form={rejectForm}
            layout="vertical"
            onFinish={onRejectSubmit}
            className="points-config-form"
          >
            <div style={{ marginBottom: 16, color: 'rgba(255, 255, 255, 0.85)' }}>
              <div style={{ marginBottom: 8 }}>用户: {currentRecord.userName || currentRecord.userId}</div>
              <div>充值金额: {currentRecord.requestedAmount} RM</div>
            </div>

            <Form.Item
              name="notes"
              label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>拒绝原因</span>}
              rules={[{ required: true, message: '请输入拒绝原因' }]}
            >
              <Input.TextArea 
                rows={4} 
                placeholder="输入拒绝原因..." 
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

