<template>
  <div class="ake-root">
    <div class="ake-header">
      <div class="ake-title">汽车专家文档库</div>
      <div class="ake-subtitle">Automotive Expert Documents</div>
    </div>

    <!-- 统计行:汽车场景 0/0/0 -->
    <div class="ake-stats">
      <div class="ake-stat"><span class="ake-stat__v">0</span><span class="ake-stat__l">文档</span></div>
      <div class="ake-stat"><span class="ake-stat__v">0</span><span class="ake-stat__l">已验证</span></div>
      <div class="ake-stat"><span class="ake-stat__v">0</span><span class="ake-stat__l">证据</span></div>
    </div>

    <!-- 空状态 -->
    <div class="ake-empty">
      <el-empty description="当前尚未收录已验证专家文档" :image-size="90" />
      <div class="ake-note">汽车知识库后端尚未接入;接入后经 automotiveKnowledge API 自动填充。</div>
      <div class="ake-tag-row">
        <el-tag size="small" type="info" effect="plain">待建设</el-tag>
        <el-tag size="small" type="info" effect="plain">0 已验证资料</el-tag>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AutomotiveKnowledgeEmpty',
}
</script>

<style scoped>
.ake-root {
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.ake-header {
  padding: 16px 20px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}
.ake-title { font-size: 16px; font-weight: 700; color: #303133; }
.ake-subtitle { font-size: 12px; color: #909399; margin-top: 2px; }
.ake-stats {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}
.ake-stat { flex: 1; text-align: center; }
.ake-stat__v { display: block; font-size: 26px; font-weight: 700; color: #c0c4cc; }
.ake-stat__l { font-size: 12px; color: #909399; }
.ake-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
}
.ake-note { font-size: 12px; color: #909399; text-align: center; }
.ake-tag-row { display: flex; gap: 8px; }
</style>
