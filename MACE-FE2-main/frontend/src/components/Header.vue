<template>
  <div class="head">
    <!--   Name   -->
    <div class="head-left">
      <div class="name-font">多Agent计算实验平台</div>
    </div>
    <!--   中间阶段徽标   -->
    <div class="head-center">
      <div
        v-if="currentPhase"
        class="phase-tag"
        :class="'phase-' + currentPhase"
      >
        <span class="phase-icon">
          <svg v-if="currentPhase === 'pre'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 7H21V11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="currentPhase === 'during'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2.5"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="phase-text">{{ phaseNames[currentPhase] }}</span>
      </div>
    </div>
    <!--   右侧按钮   -->
    <div class="head-right">
      <!--   头像   -->
      <div class="avatar-wrapper">
        <img src="../assets/images/bg-tju2.jpg" alt="avatar"/>
      </div>
      <span class="user-info">{{identify}}: {{username}}</span>
	    <!--   返回   -->
	    <el-button style="margin-left: 1.5rem" circle @click="back()">
		    <img src="../assets/images/back.png" style="width: 14px" alt="backBtn"/>
	    </el-button>
      <!--   退出   -->
      <el-button style="margin-right: 0.5rem" circle @click="exit()">
        <el-icon><SwitchButton /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script>
import {SwitchButton} from "@element-plus/icons-vue";
import { PHASE_EVENT, PHASE_STORAGE_KEY, ROUTE_TO_PHASE } from "@/constants/scnetPhase";

export default {
  name: "Header",
  components: {SwitchButton},
  computed: {
    SwitchButton() {
      return SwitchButton
    },
    currentPhase() {
      if (this.storedPhase) return this.storedPhase
      return ROUTE_TO_PHASE[this.$route.path] || null
    }
  },
  data(){
    return{
      identifies: ['Name'],
      identify: '',
      username: '普通用户',
      storedPhase: null,
      phaseNames: {
        pre: '事前：风险识别与预警',
        during: '事中：应急响应与调度',
        post: '事后：复盘优化与重构'
      }
    }
  },
  created(){
    this.identify = this.identifies[0];
    this.storedPhase = localStorage.getItem(PHASE_STORAGE_KEY);
  },
  mounted(){
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener(PHASE_EVENT, this.handlePhaseChange);
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener(PHASE_EVENT, this.handlePhaseChange);
  },
  methods:{
    handleStorageChange(event) {
      if (event.key === PHASE_STORAGE_KEY) {
        this.storedPhase = event.newValue || null;
      }
    },
    handlePhaseChange(event) {
      if (event && event.detail) {
        this.storedPhase = event.detail;
      }
    },
    back(){
      this.$router.push('/home')
    },
    exit(){
      window.sessionStorage.clear();
      this.$router.push('/')
    }
  }

}
</script>

<style scoped>
.head{
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  min-width: 0;
  width: 100%;
  background-color: #fff;
  box-shadow: 0 1px 3px 0 rgba(204, 204, 204, 0.5);
  padding: 0 12px;
  box-sizing: border-box;
}
.head-left {
  display: flex;
  align-items: center;
  min-width: 180px;
  margin-left: 2rem;
}
.head-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 3vw;
  min-width: 0;
}
.head-right {
  display: flex;
  align-items: center;
  margin-right: 1rem;
  color: #73767a;
}
.name-font{
  color: #114f8c;
  font-weight: bolder;
  font-size: 25px;
}
.avatar-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  height: 40px;
  width: 40px;
  border-radius: 100%;
  border: #e0e0e0 1px solid;
}
.avatar-wrapper img {
  border-radius: 100%;
  height: 35px;
  width: 35px;
}
.user-info {
  white-space: nowrap;
}
.phase-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.phase-pre {
  color: #3b82f6;
  background-color: #eff6ff;
  border-color: #bfdbfe;
}
.phase-during {
  color: #f59e0b;
  background-color: #fffbeb;
  border-color: #fde68a;
}
.phase-post {
  color: #8b5cf6;
  background-color: #f5f3ff;
  border-color: #ddd6fe;
}
.phase-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}
.phase-icon svg {
  width: 18px;
  height: 18px;
}
.phase-text {
  letter-spacing: 1px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1000px) {
  .name-font { font-size: 20px; margin-left: 6px; }
  .head-left { margin-left: 8px; }
  .phase-text { max-width: 160px; }
  .user-info { display: none; }
}
@media (max-width: 700px) {
  .name-font { font-size: 18px; }
  .avatar-wrapper { width: 32px; height: 32px; }
  .avatar-wrapper img { width: 28px; height: 28px; }
  .phase-text { display: none; }
  .head { height: 56px; }
}
</style>
