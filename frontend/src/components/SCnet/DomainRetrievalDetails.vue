<template>
  <div v-if="retrieval" class="retrieval-details">
    <div class="retrieval-title"><strong>本次本体子图</strong><span>{{ retrieval.nodes.length }} 个节点 · {{ retrieval.edges.length }} 条关系</span><el-tag size="small" effect="plain">{{ retrieval.mode === 'manual' ? '手动指定范围' : retrieval.mode === 'overview' ? '框架总览' : '按问题检索' }}</el-tag></div>
    <p v-if="retrieval.anchors.length" class="anchor-line"><b>定位到</b><el-tag v-for="anchor in retrieval.anchors.slice(0, 10)" :key="anchor.id" size="small" :title="anchor.reason">{{ anchor.label }}</el-tag></p>
    <div v-if="retrieval.paths.length" class="path-list"><b>选取依据与连接路径</b><p v-for="(path, index) in retrieval.paths.slice(0, 5)" :key="index">{{ path.explanation }}</p></div>
    <el-alert v-for="warning in retrieval.warnings" :key="warning" :title="warning" type="warning" :closable="false"/>
    <p class="scope-note">按框架中已定义的关系连接，计算输入会完整保留。具体企业和零件的供货事实由本次数据确认。</p>
  </div>
</template>
<script setup>
defineProps({retrieval:{type:Object,default:null}})
</script>
<style scoped>
.retrieval-details{margin-top:14px;padding:15px 17px;border:1px solid #dbe6f7;border-radius:10px;background:#f8fbff}.retrieval-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:#1e40af}.retrieval-title span{font-size:11px;color:#64748b}.anchor-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.anchor-line b,.path-list b{font-size:12px;color:#475569}.path-list p{padding:7px 10px;border-left:2px solid #60a5fa;background:white;font-size:12px;line-height:1.8;color:#475569;margin:7px 0;overflow-wrap:anywhere}.scope-note{font-size:11px;color:#64748b;line-height:1.8;margin:10px 0 0}.retrieval-details .el-alert{margin-top:10px}
</style>
