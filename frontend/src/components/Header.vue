<template>
  <div class="head">
    <!--   Name   -->
    <div class="head-left">
      <div class="name-font">多Agent计算实验平台</div>
    </div>
    <!-- 阶段快捷导航 -->
    <div class="head-center">
      <ScnetPhaseNav />
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
import ScnetPhaseNav from "@/components/ScnetPhaseNav.vue";

export default {
  name: "Header",
  components: {SwitchButton, ScnetPhaseNav},
  data(){
    return{
      identifies: ['Name'],
      identify: '',
      username: '普通用户'
    }
  },
  created(){
    this.identify = this.identifies[0];
  },
  methods:{
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
@media (max-width: 1000px) {
  .name-font { font-size: 20px; margin-left: 6px; }
  .head-left { margin-left: 8px; }
  .user-info { display: none; }
}
@media (max-width: 700px) {
  .name-font { font-size: 18px; }
  .avatar-wrapper { width: 32px; height: 32px; }
  .avatar-wrapper img { width: 28px; height: 28px; }
  .head { height: 56px; }
}
</style>
