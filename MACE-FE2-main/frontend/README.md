# MACE-FE2 前端项目

基于 Vue 3 + Vite 开发的 MACE 多智能体协同实验平台前端。

## 快速启动

### 使用管理脚本（推荐）
```bash
./frontend.sh start    # 启动服务
./frontend.sh status   # 查看状态
./frontend.sh logs     # 查看日志
./frontend.sh stop     # 停止服务
./frontend.sh restart  # 重启服务
./frontend.sh build    # 构建生产版本
```

### 手动启动
```bash
npm install    # 首次运行需要安装依赖
npm run dev    # 启动开发服务器
```

访问地址：`http://localhost:8080`

## 脚本命令说明

| 命令 | 功能 |
|------|------|
| `./frontend.sh start` | 启动前端服务（后台运行） |
| `./frontend.sh stop` | 停止前端服务 |
| `./frontend.sh restart` | 重启前端服务 |
| `./frontend.sh status` | 查看运行状态、进程信息、端口占用 |
| `./frontend.sh logs [N]` | 查看最近N行日志（默认50） |
| `./frontend.sh logs -f` | 实时查看日志 |
| `./frontend.sh clean` | 清理日志文件 |
| `./frontend.sh build` | 构建生产版本到 dist/ |
| `./frontend.sh install` | 安装依赖 |

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 其他命令

### 安装依赖
```sh
npm install
# 或使用脚本
./frontend.sh install
```

### 开发模式（手动）
```sh
npm run dev
```

### 构建生产版本
```sh
npm run build
# 或使用脚本
./frontend.sh build
```

### 代码检查
```sh
npm run lint
```

## 项目配置
