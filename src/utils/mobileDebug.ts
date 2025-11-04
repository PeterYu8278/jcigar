/**
 * 移动端调试工具
 * 仅在移动设备上显示控制台
 */

let vConsole: any = null

export const initMobileDebug = () => {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   /Mobile|mobile|Tablet|tablet/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0);

  // 只在移动设备上启用
  if (isMobile && !vConsole) {
    import('vconsole').then(({ default: VConsole }) => {
      vConsole = new VConsole({
        theme: 'dark',
        defaultPlugins: ['system', 'network', 'element', 'storage'],
        maxLogNumber: 1000
      })
      console.log('✅ VConsole 已启动（移动端调试工具）')
    }).catch(error => {
      console.error('VConsole 加载失败:', error)
    })
  }
}

export const destroyMobileDebug = () => {
  if (vConsole) {
    vConsole.destroy()
    vConsole = null
    console.log('🔴 VConsole 已关闭')
  }
}

