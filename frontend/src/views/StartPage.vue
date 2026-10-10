<template>
	<div class="app-container">
	</div>
	<div style="position: absolute; width: 70%; margin-top: 15%; display: flex; flex-direction: column; margin-left: 15%; z-index: 5">
		<span style="font-size: 45px; color: #FFF; font-weight: bolder">
			MACE: SCnet Simulation Platform
		</span>
		<span style="color: #FFF; font-size: 14px; font-weight: lighter; margin-top: 5px">
			Welcome to SCnet supply chain scenario.
		</span>
		<div>
			<el-button style="width: 200px; height: 45px; margin-top: 2rem; font-size: 23px; font-weight: bold"
			           type="primary" round @click="getStart()">Get Started
			</el-button>
		</div>
	</div>
</template>

<script>
export default {
	name: "StartPage",
	methods: {
		getStart() {
			this.$router.push('/home')
		}
	}
}
</script>

<style scoped>
.app-container {
	display: flex;
	background: url("../assets/images/bg-tju1.jpg") no-repeat center;
	height: 100%;
	width: 100%;
	background-size: cover;
	position: absolute;
	z-index: 2;
}

.app-container::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(52, 77, 140, 0.2); /*这里设置浅浅的颜色，rgba 的最后一个参数控制透明度*/
}
</style>
