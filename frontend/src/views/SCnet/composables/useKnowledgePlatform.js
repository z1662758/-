import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue'

/**
 * 知识平台全屏浮层（数据治理 / 知识库 / 本体与知识图谱）。
 *
 * 它没有独立路由：/SCnet/total 右上角「知识平台」按钮、左侧栏常驻的「知识库」
 * 入口，打开的都是同一个浮层。浮层铺满视口并 Teleport 到 body，所以要锁住底层
 * 滚动、接管 Esc 关闭，否则滚轮会穿透到下面的页面。
 *
 * 组件体量大（知识库单包 678 kB），按需异步加载，点了才拉。
 *
 * 用法：
 *   const { KnowledgePlatform, visible, open, close } = useKnowledgePlatform()
 *   <component :is="KnowledgePlatform" v-if="visible" @close="close" />
 */
const KnowledgePlatform = defineAsyncComponent(() => import('../KnowledgePlatform.vue'))

export function useKnowledgePlatform() {
  const visible = ref(false)
  let onKeydown = null

  const close = () => {
    visible.value = false
    document.body.style.overflow = ''
    if (onKeydown) {
      window.removeEventListener('keydown', onKeydown)
      onKeydown = null
    }
  }

  const open = () => {
    if (visible.value) return
    visible.value = true
    document.body.style.overflow = 'hidden'
    // 知识平台自带关闭按钮，Esc 与它是等价语义
    onKeydown = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeydown)
  }

  // 宿主组件卸载时浮层会跟着消失，锁滚动与键盘监听必须一并收回
  onBeforeUnmount(close)

  return { KnowledgePlatform, visible, open, close }
}
