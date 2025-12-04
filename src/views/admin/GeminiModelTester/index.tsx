/**
 * Gemini 模型测试与优化系统 - 主页面
 */

import { useState, useRef } from 'react';
import { 
    Card, 
    Upload, 
    Button, 
    InputNumber, 
    Switch, 
    Progress, 
    Table, 
    Tabs, 
    Space,
    Typography,
    message,
    Statistic,
    Row,
    Col,
    Tag,
    Modal
} from 'antd';
import {
    UploadOutlined,
    PlayCircleOutlined,
    StopOutlined,
    DownloadOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { TestConfig, TestProgress, TestReport, ModelTestResult } from '@/types/geminiTest';
import { testAllModels } from '@/services/gemini/modelTester';
import { generateTestReport, printConsoleReport } from '@/services/gemini/modelStatistics';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export default function GeminiModelTester() {
    // 测试配置
    const [config, setConfig] = useState<TestConfig>({
        testImage: null,
        testTimes: 5,
        concurrency: 1,
        includeExperimental: false,
        includePreview: false,
        delayBetweenCalls: 2000
    });
    
    // 测试状态
    const [progress, setProgress] = useState<TestProgress>({
        currentModel: '',
        currentAttempt: 0,
        totalAttempts: 0,
        completedModels: 0,
        totalModels: 0,
        percentage: 0,
        status: 'idle'
    });
    
    // 测试结果
    const [report, setReport] = useState<TestReport | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const startTimeRef = useRef<number>(0);
    
    // 数据统计选择
    const [selectedModelForStats, setSelectedModelForStats] = useState<string>('');
    
    // 文件上传处理
    const handleFileChange = (info: any) => {
        const file = info.file.originFileObj || info.file;
        if (file && file.type.startsWith('image/')) {
            setConfig({ ...config, testImage: file });
            message.success(`已选择图片: ${file.name}`);
        } else {
            message.error('请上传图片文件');
        }
    };
    
    // 开始测试
    const handleStartTest = async () => {
        if (!config.testImage) {
            message.error('请先上传测试图片');
            return;
        }
        
        setIsRunning(true);
        startTimeRef.current = Date.now();
        
        setProgress({
            currentModel: '',
            currentAttempt: 0,
            totalAttempts: 0,
            completedModels: 0,
            totalModels: 0,
            percentage: 0,
            status: 'running'
        });
        
        try {
            const results = await testAllModels(
                config,
                (current, total, modelName) => {
                    setProgress(prev => ({
                        ...prev,
                        currentModel: modelName,
                        completedModels: current,
                        totalModels: total,
                        percentage: Math.round((current / total) * 100)
                    }));
                }
            );
            
            const testReport = generateTestReport(
                config,
                results,
                startTimeRef.current,
                Date.now()
            );
            
            setReport(testReport);
            setProgress(prev => ({ ...prev, status: 'completed' }));
            
            // 打印控制台报告
            printConsoleReport(testReport);
            
            message.success('测试完成！请查看控制台获取详细统计');
            
        } catch (error: any) {
            message.error(`测试失败: ${error.message}`);
            setProgress(prev => ({ ...prev, status: 'error' }));
        } finally {
            setIsRunning(false);
        }
    };
    
    // 停止测试
    const handleStopTest = () => {
        setIsRunning(false);
        setProgress(prev => ({ ...prev, status: 'paused' }));
        message.info('测试已停止');
    };
    
    // 重置
    const handleReset = () => {
        setProgress({
            currentModel: '',
            currentAttempt: 0,
            totalAttempts: 0,
            completedModels: 0,
            totalModels: 0,
            percentage: 0,
            status: 'idle'
        });
        setReport(null);
        message.info('已重置');
    };
    
    // 导出结果
    const handleExport = () => {
        if (!report) {
            message.warning('没有可导出的测试结果');
            return;
        }
        
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-test-report-${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        message.success('报告已导出');
    };
    
    // 模型结果表格列
    const modelColumns = [
        {
            title: '排名',
            dataIndex: 'index',
            key: 'index',
            width: 60,
            render: (_: any, __: any, index: number) => index + 1
        },
        {
            title: '模型名称',
            dataIndex: 'modelName',
            key: 'modelName',
            width: 280
        },
        {
            title: '成功率',
            dataIndex: 'successes',
            key: 'successRate',
            width: 100,
            render: (successes: number, record: ModelTestResult) => 
                `${((successes / record.attempts) * 100).toFixed(1)}%`,
            sorter: (a: ModelTestResult, b: ModelTestResult) => 
                (a.successes / a.attempts) - (b.successes / b.attempts)
        },
        {
            title: '响应时间',
            dataIndex: 'avgResponseTime',
            key: 'avgResponseTime',
            width: 100,
            render: (time: number) => `${time.toFixed(0)}ms`,
            sorter: (a: ModelTestResult, b: ModelTestResult) => 
                a.avgResponseTime - b.avgResponseTime
        },
        {
            title: '数据完整度',
            dataIndex: 'dataQuality',
            key: 'dataQuality',
            width: 120,
            render: (quality: ModelTestResult['dataQuality']) => 
                `${((quality.avgFieldCount / 15) * 100).toFixed(1)}%`
        },
        {
            title: '可靠性评分',
            dataIndex: 'reliabilityScore',
            key: 'reliabilityScore',
            width: 120,
            render: (score: number) => (
                <Progress 
                    percent={score} 
                    size="small"
                    status={score >= 70 ? 'success' : score >= 40 ? 'normal' : 'exception'}
                />
            ),
            sorter: (a: ModelTestResult, b: ModelTestResult) => 
                a.reliabilityScore - b.reliabilityScore
        },
        {
            title: '推荐度',
            dataIndex: 'recommendation',
            key: 'recommendation',
            width: 120,
            render: (rec: string) => {
                const colorMap: { [key: string]: string } = {
                    'highly_recommended': 'green',
                    'recommended': 'blue',
                    'use_with_caution': 'orange',
                    'not_recommended': 'red'
                };
                const textMap: { [key: string]: string } = {
                    'highly_recommended': '强烈推荐',
                    'recommended': '推荐',
                    'use_with_caution': '谨慎使用',
                    'not_recommended': '不推荐'
                };
                return <Tag color={colorMap[rec]}>{textMap[rec]}</Tag>;
            }
        }
    ];
    
    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>🧪 Gemini 模型测试与优化系统</Title>
            <Paragraph type="secondary">
                全面测试所有 Gemini 模型的可用性、性能和数据质量，为模型选择提供数据支持
            </Paragraph>
            
            <Row gutter={[16, 16]}>
                {/* 配置面板 */}
                <Col span={24}>
                    <Card title="⚙️ 测试配置" size="small">
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            {/* 图片上传 */}
                            <div>
                                <Text strong>测试图片：</Text>
                                <Upload
                                    accept="image/*"
                                    maxCount={1}
                                    onChange={handleFileChange}
                                    beforeUpload={() => false}
                                >
                                    <Button icon={<UploadOutlined />}>
                                        选择雪茄图片
                                    </Button>
                                </Upload>
                                {config.testImage && (
                                    <Text type="success" style={{ marginLeft: 8 }}>
                                        ✅ {config.testImage.name}
                                    </Text>
                                )}
                            </div>
                            
                            {/* 测试配置 */}
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Space>
                                        <Text>每个模型测试次数：</Text>
                                        <InputNumber
                                            min={1}
                                            max={10}
                                            value={config.testTimes}
                                            onChange={(value) => 
                                                setConfig({ ...config, testTimes: value || 5 })
                                            }
                                            disabled={isRunning}
                                        />
                                    </Space>
                                </Col>
                                <Col span={6}>
                                    <Space>
                                        <Text>调用间隔（毫秒）：</Text>
                                        <InputNumber
                                            min={1000}
                                            max={10000}
                                            step={500}
                                            value={config.delayBetweenCalls}
                                            onChange={(value) => 
                                                setConfig({ ...config, delayBetweenCalls: value || 2000 })
                                            }
                                            disabled={isRunning}
                                        />
                                    </Space>
                                </Col>
                                <Col span={6}>
                                    <Space>
                                        <Text>包含实验性模型：</Text>
                                        <Switch
                                            checked={config.includeExperimental}
                                            onChange={(checked) => 
                                                setConfig({ ...config, includeExperimental: checked })
                                            }
                                            disabled={isRunning}
                                        />
                                    </Space>
                                </Col>
                                <Col span={6}>
                                    <Space>
                                        <Text>包含预览版模型：</Text>
                                        <Switch
                                            checked={config.includePreview}
                                            onChange={(checked) => 
                                                setConfig({ ...config, includePreview: checked })
                                            }
                                            disabled={isRunning}
                                        />
                                    </Space>
                                </Col>
                            </Row>
                            
                            {/* 操作按钮 */}
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={handleStartTest}
                                    disabled={!config.testImage || isRunning}
                                    size="large"
                                >
                                    开始测试
                                </Button>
                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    onClick={handleStopTest}
                                    disabled={!isRunning}
                                    size="large"
                                >
                                    停止测试
                                </Button>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={handleReset}
                                    disabled={isRunning}
                                    size="large"
                                >
                                    重置
                                </Button>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    disabled={!report}
                                    size="large"
                                >
                                    导出报告
                                </Button>
                            </Space>
                        </Space>
                    </Card>
                </Col>
                
                {/* 进度面板 */}
                {progress.status !== 'idle' && (
                    <Col span={24}>
                        <Card title="📊 测试进度" size="small">
                            <Progress 
                                percent={progress.percentage} 
                                status={progress.status === 'running' ? 'active' : 
                                       progress.status === 'completed' ? 'success' : 
                                       progress.status === 'error' ? 'exception' : 'normal'}
                            />
                            <div style={{ marginTop: 16 }}>
                                <Text>
                                    当前测试: <Text strong>{progress.currentModel}</Text> 
                                    ({progress.completedModels}/{progress.totalModels} 模型)
                                </Text>
                            </div>
                        </Card>
                    </Col>
                )}
                
                {/* 统计面板 */}
                {report && (
                    <Col span={24}>
                        <Card title="📈 测试统计" size="small">
                            <Row gutter={16}>
                                <Col span={4}>
                                    <Statistic 
                                        title="测试时长" 
                                        value={(report.duration / 1000 / 60).toFixed(1)} 
                                        suffix="分钟"
                                    />
                                </Col>
                                <Col span={4}>
                                    <Statistic 
                                        title="测试模型" 
                                        value={report.summary.totalModels} 
                                        suffix="个"
                                    />
                                </Col>
                                <Col span={4}>
                                    <Statistic 
                                        title="可用模型" 
                                        value={report.summary.reliableModels} 
                                        suffix="个"
                                        valueStyle={{ color: '#3f8600' }}
                                    />
                                </Col>
                                <Col span={4}>
                                    <Statistic 
                                        title="平均成功率" 
                                        value={report.summary.avgSuccessRate.toFixed(1)} 
                                        suffix="%"
                                    />
                                </Col>
                                <Col span={4}>
                                    <Statistic 
                                        title="平均响应" 
                                        value={report.summary.avgResponseTime.toFixed(0)} 
                                        suffix="ms"
                                    />
                                </Col>
                                <Col span={4}>
                                    <Statistic 
                                        title="数据完整度" 
                                        value={report.summary.avgDataCompleteness.toFixed(1)} 
                                        suffix="%"
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                )}
                
                {/* 详细结果 */}
                {report && (
                    <Col span={24}>
                        <Card title="📋 详细结果">
                            <Tabs defaultActiveKey="models">
                                <TabPane tab="模型列表" key="models">
                                    <Table
                                        columns={modelColumns}
                                        dataSource={[...report.modelResults].sort((a, b) => 
                                            b.reliabilityScore - a.reliabilityScore
                                        )}
                                        rowKey="modelName"
                                        pagination={{ pageSize: 15 }}
                                        size="small"
                                    />
                                </TabPane>
                                
                                <TabPane tab="数据统计" key="data-stats">
                                    <div style={{ padding: '16px' }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                                            {/* 模型选择 */}
                                            <div>
                                                <Text strong style={{ marginRight: 8 }}>选择模型:</Text>
                                                <Select
                                                    style={{ width: 400 }}
                                                    placeholder="选择模型查看详细数据统计"
                                                    value={selectedModelForStats || undefined}
                                                    onChange={(value) => setSelectedModelForStats(value)}
                                                    options={report.modelResults
                                                        .filter(r => r.isReliable && r.responses.length > 0)
                                                        .map(r => ({
                                                            label: `${r.modelName} (${r.successes}/${r.attempts}次成功)`,
                                                            value: r.modelName
                                                        }))
                                                    }
                                                />
                                            </div>
                                            
                                            {/* 显示选中模型的详细统计 */}
                                            {selectedModelForStats && (() => {
                                                const modelData = report.modelResults.find(r => r.modelName === selectedModelForStats);
                                                if (!modelData || !modelData.fieldValueStats) return null;
                                                
                                                const keyFields = [
                                                    'origin', 'wrapper', 'binder', 'filler', 
                                                    'flavorProfile', 'footTasteNotes', 'bodyTasteNotes', 'headTasteNotes', 
                                                    'strength', 'size'
                                                ];
                                                
                                                return (
                                                    <div>
                                                        {keyFields.map(fieldName => {
                                                            const fieldStats = modelData.fieldValueStats[fieldName];
                                                            if (!fieldStats) return null;
                                                            
                                                            const icon = {
                                                                origin: '🌍',
                                                                wrapper: '🍂',
                                                                binder: '🌿',
                                                                filler: '🌾',
                                                                flavorProfile: '🎨',
                                                                footTasteNotes: '👃',
                                                                bodyTasteNotes: '👃',
                                                                headTasteNotes: '👃',
                                                                strength: '💪',
                                                                size: '📏'
                                                            }[fieldName] || '📋';
                                                            
                                                            return (
                                                                <Card 
                                                                    key={fieldName}
                                                                    size="small"
                                                                    title={
                                                                        <span>
                                                                            {icon} {fieldStats.displayName} ({fieldName})
                                                                        </span>
                                                                    }
                                                                    extra={
                                                                        <Tag color={fieldStats.fillRate >= 80 ? 'green' : fieldStats.fillRate >= 50 ? 'orange' : 'red'}>
                                                                            填充率: {fieldStats.fillRate.toFixed(0)}% ({fieldStats.nonEmptyCount}/{fieldStats.totalResponses})
                                                                        </Tag>
                                                                    }
                                                                    style={{ marginBottom: 16 }}
                                                                >
                                                                    {fieldStats.fieldType === 'array' && fieldStats.totalValues && (
                                                                        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                                                                            总计: {fieldStats.totalValues}个值, 平均每次: {fieldStats.avgValuesPerResponse?.toFixed(1)}个
                                                                        </Paragraph>
                                                                    )}
                                                                    
                                                                    {fieldStats.values.length > 0 ? (
                                                                        <Table
                                                                            dataSource={fieldStats.values.slice(0, 10)}
                                                                            columns={[
                                                                                {
                                                                                    title: '值',
                                                                                    dataIndex: 'value',
                                                                                    key: 'value'
                                                                                },
                                                                                {
                                                                                    title: '次数',
                                                                                    dataIndex: 'count',
                                                                                    key: 'count',
                                                                                    render: (count) => `x${count}`
                                                                                },
                                                                                {
                                                                                    title: '占比',
                                                                                    dataIndex: 'percentage',
                                                                                    key: 'percentage',
                                                                                    render: (percentage) => (
                                                                                        <div>
                                                                                            <Progress 
                                                                                                percent={percentage} 
                                                                                                size="small"
                                                                                                format={(p) => `${p?.toFixed(1)}%`}
                                                                                            />
                                                                                        </div>
                                                                                    )
                                                                                }
                                                                            ]}
                                                                            pagination={false}
                                                                            size="small"
                                                                            rowKey="value"
                                                                        />
                                                                    ) : (
                                                                        <Text type="secondary">(无数据)</Text>
                                                                    )}
                                                                    
                                                                    {fieldStats.emptyCount > 0 && (
                                                                        <Paragraph type="warning" style={{ marginTop: 8 }}>
                                                                            ⚠️ 未返回: {fieldStats.emptyCount}次 ({(fieldStats.emptyCount / fieldStats.totalResponses * 100).toFixed(0)}%)
                                                                        </Paragraph>
                                                                    )}
                                                                </Card>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </Space>
                                    </div>
                                </TabPane>
                                
                                <TabPane tab="优化建议" key="recommendations">
                                    <div style={{ padding: '16px' }}>
                                        {report.recommendations.map((rec, index) => (
                                            <Paragraph key={index}>
                                                {rec}
                                            </Paragraph>
                                        ))}
                                    </div>
                                </TabPane>
                            </Tabs>
                        </Card>
                    </Col>
                )}
            </Row>
        </div>
    );
}

