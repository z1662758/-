import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import VueWechatTitle from 'vue-wechat-title'
import AMap from 'vue-amap'
import FileSaver from 'file-saver'
import 'animate.css'
import axios from 'axios'
import '@layui/layui-vue/lib/index.css'
//引入css
import '@/assets/css/global.css'

// 创建Pinia实例
const pinia = createPinia()

const app = createApp(App)

// 全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error Handler]', {
    error: err,
    component: instance?.$options?.name || 'Unknown',
    info
  })

  // 在开发环境显示详细错误
  if (import.meta.env.DEV) {
    console.error('Error details:', err)
  }

  // 可以在这里添加错误上报逻辑
  // 例如：errorReportService.report(err, instance, info)
}

// 全局警告处理器（开发环境）
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('[Global Warning]', {
      message: msg,
      component: instance?.$options?.name || 'Unknown',
      trace
    })
  }
}

// 性能监控（开发环境）
if (import.meta.env.DEV) {
  app.config.performance = true
}

app
  .use(pinia)
  .use(ElementPlus, {
    locale: zhCn,
    size: "large",
    /*
     * Element Plus 的浮层（消息提示 / 下拉 / 日期面板…）z-index 默认从 2000 起递增，
     * 低于本项目里几处全屏浮层（知识平台 kp-shell、知识图谱遮罩、对话侧栏 = 9999），
     * 结果在这些浮层里 ElMessage 和下拉会被压在下面看不见。
     * 起步值抬到 10000：应用自身 chrome 最高 9999，EP 浮层永远在其之上。
     */
    zIndex: 10000
  })
  .use(AMap, {
    // 高德的key（从环境变量读取）
    key: import.meta.env.VITE_AMAP_KEY,
    // 插件集合
    plugin: ['AMapManager', 'AMap.Autocomplete', 'AMap.PlaceSearch', 'AMap.Scale', 'AMap.OverView', 'AMap.ToolBar', 'AMap.MapType', 'AMap.PolyEditor', 'AMap.CircleEditor','Geocoder','Geolocation', 'AMap.MarkerClusterer','AMap.PolyEditor', 'AMap.CircleEditor', 'AMap.MouseTool', 'AMap.Driving', 'AMap.CitySearch', 'AMap.InfoWindow', 'AMap.LngLat', 'AMap.DistrictSearch', 'AMap.TileLayer.Traffic', 'AMap.Heatmap', 'AMap.Autocomplete', 'AMap.PlaceSearch'],
    // 高德 sdk 版本，默认为 1.4.4
    v: '1.4.4'
  })
  .use(VueWechatTitle)
  .use(router)
  .mount('#app')
