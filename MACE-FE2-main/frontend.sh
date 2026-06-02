#!/bin/bash

###############################################################################
# SCnet 前端服务管理脚本
# 功能: 启动、停止、重启、查看状态（含崩溃自动恢复）
# 作者: MACE Team
# 日期: 2026-04-24
###############################################################################

# 配置变量
PROJECT_DIR="/root/MACE-FE2/frontend"
PID_FILE="$PROJECT_DIR/frontend.pid"
WATCHDOG_PID_FILE="$PROJECT_DIR/frontend.watchdog.pid"
STOP_FLAG_FILE="$PROJECT_DIR/frontend.stop"
LOG_FILE="$PROJECT_DIR/frontend.log"
PORT=8080
PREFERRED_NODE_VERSION="v20.19.6"
NVM_BIN_DIR="/root/.nvm/versions/node/$PREFERRED_NODE_VERSION/bin"
if [ -d "$NVM_BIN_DIR" ]; then
    export PATH="$NVM_BIN_DIR:$PATH"
fi
NPM_CMD="npm"
RESTART_DELAY=3
STARTUP_TIMEOUT=20
SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || echo "$0")"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 日志记录（watchdog使用）
log_watchdog() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WATCHDOG] $1" >> "$LOG_FILE"
}

# 通用PID检测
is_pid_alive() {
    local pid="$1"
    [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1
}

# 检查前端主进程是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if is_pid_alive "$PID"; then
            return 0
        fi
        rm -f "$PID_FILE"
    fi
    return 1
}

# 检查watchdog是否运行
is_watchdog_running() {
    if [ -f "$WATCHDOG_PID_FILE" ]; then
        WDPID=$(cat "$WATCHDOG_PID_FILE")
        if is_pid_alive "$WDPID"; then
            return 0
        fi
        rm -f "$WATCHDOG_PID_FILE"
    fi
    return 1
}

# 获取进程信息
get_process_info() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        ps -p "$PID" -o pid,ppid,%cpu,%mem,etime,cmd --no-headers
        return 0
    fi
    return 1
}

# 优雅终止进程及子进程
terminate_process_tree() {
    local pid="$1"
    local child_pids

    if ! is_pid_alive "$pid"; then
        return 0
    fi

    child_pids=$(pgrep -P "$pid" 2>/dev/null)
    kill "$pid" 2>/dev/null
    if [ -n "$child_pids" ]; then
        echo "$child_pids" | xargs kill 2>/dev/null
    fi

    for _ in {1..10}; do
        if ! is_pid_alive "$pid"; then
            break
        fi
        sleep 1
    done

    if is_pid_alive "$pid"; then
        kill -9 "$pid" 2>/dev/null
        if [ -n "$child_pids" ]; then
            echo "$child_pids" | xargs kill -9 2>/dev/null
        fi
    fi
}

# 清理端口残留和项目作用域内的vite子进程
cleanup_leftovers() {
    pkill -f "$PROJECT_DIR/node_modules/.bin/vite" 2>/dev/null
    sleep 1
    if lsof -ti:$PORT > /dev/null 2>&1; then
        kill -9 $(lsof -ti:$PORT) 2>/dev/null
    fi
}

# watchdog循环（内部命令）
watchdog_loop() {
    cd "$PROJECT_DIR" || exit 1
    rm -f "$STOP_FLAG_FILE"
    log_watchdog "前端自动恢复守护已启动 (watchdog PID=$$)"

    # 守护被杀时带走子进程，避免孤儿
    trap 'log_watchdog "watchdog收到信号，清理子进程"; [ -n "$CHILD_PID" ] && kill -TERM "$CHILD_PID" 2>/dev/null; sleep 2; [ -n "$CHILD_PID" ] && kill -KILL "$CHILD_PID" 2>/dev/null; rm -f "$PID_FILE" "$WATCHDOG_PID_FILE"; exit 0' TERM INT HUP

    local fail_count=0
    local last_start_ts=0
    local now_ts backoff

    while true; do
        if [ -f "$STOP_FLAG_FILE" ]; then
            break
        fi

        cleanup_leftovers
        last_start_ts=$(date +%s)

        log_watchdog "启动前端服务: $NPM_CMD run dev"
        "$NPM_CMD" run dev >> "$LOG_FILE" 2>&1 &
        CHILD_PID=$!
        echo "$CHILD_PID" > "$PID_FILE"

        wait "$CHILD_PID"
        EXIT_CODE=$?
        rm -f "$PID_FILE"

        # 杀掉npm可能残留的子进程（vite等）
        CHILD_PIDS=$(pgrep -P "$CHILD_PID" 2>/dev/null)
        if [ -n "$CHILD_PIDS" ]; then
            echo "$CHILD_PIDS" | xargs kill 2>/dev/null
            sleep 1
            echo "$CHILD_PIDS" | xargs kill -9 2>/dev/null
        fi
        cleanup_leftovers

        if [ -f "$STOP_FLAG_FILE" ]; then
            log_watchdog "检测到停止标记，退出守护"
            break
        fi

        now_ts=$(date +%s)
        if [ $((now_ts - last_start_ts)) -lt 15 ]; then
            fail_count=$((fail_count + 1))
        else
            fail_count=0
        fi
        backoff=$RESTART_DELAY
        if [ "$fail_count" -ge 3 ]; then
            backoff=$((RESTART_DELAY * fail_count))
            [ "$backoff" -gt 60 ] && backoff=60
        fi

        log_watchdog "前端进程退出 (code=$EXIT_CODE, fail=$fail_count)，${backoff}s 后自动重启"
        sleep "$backoff"
    done

    rm -f "$PID_FILE" "$WATCHDOG_PID_FILE" "$STOP_FLAG_FILE"
    log_watchdog "前端自动恢复守护已退出"
}

# 启动服务
start() {
    print_info "正在启动 SCnet 前端服务（自动恢复已启用）..."

    if is_watchdog_running; then
        WDPID=$(cat "$WATCHDOG_PID_FILE")
        print_warning "前端自动恢复守护已运行 (PID: $WDPID)"
        return 1
    fi

    if is_running; then
        PID=$(cat "$PID_FILE")
        print_warning "前端服务已在运行 (PID: $PID)"
        print_warning "当前未检测到watchdog，请使用 restart 重新接管"
        return 1
    fi

    if lsof -ti:$PORT > /dev/null 2>&1; then
        print_error "端口 $PORT 已被占用，请先释放端口"
        lsof -ti:$PORT | xargs ps -p
        return 1
    fi

    cd "$PROJECT_DIR" || {
        print_error "无法切换到项目目录: $PROJECT_DIR"
        return 1
    }

    if [ ! -d "node_modules" ]; then
        print_warning "node_modules 不存在，正在安装依赖..."
        npm install || return 1
    fi

    rm -f "$STOP_FLAG_FILE"
    touch "$LOG_FILE"

    nohup "$SCRIPT_PATH" __watchdog >> "$LOG_FILE" 2>&1 &
    echo $! > "$WATCHDOG_PID_FILE"
    WDPID=$!

    for _ in $(seq 1 "$STARTUP_TIMEOUT"); do
        if is_running && lsof -ti:$PORT > /dev/null 2>&1; then
            PID=$(cat "$PID_FILE")
            print_success "前端服务启动成功！"
            print_info "服务PID: $PID"
            print_info "守护PID: $WDPID"
            print_info "端口: $PORT"
            print_info "访问地址: http://localhost:$PORT"
            print_info "日志文件: $LOG_FILE"
            return 0
        fi

        if ! is_watchdog_running; then
            break
        fi
        sleep 1
    done

    print_error "前端服务启动失败，请查看日志: $LOG_FILE"
    tail -20 "$LOG_FILE"
    rm -f "$PID_FILE" "$WATCHDOG_PID_FILE"
    return 1
}

# 停止服务
stop() {
    print_info "正在停止 SCnet 前端服务..."

    touch "$STOP_FLAG_FILE"

    if is_running; then
        PID=$(cat "$PID_FILE")
        print_info "终止前端进程 PID: $PID"
        terminate_process_tree "$PID"
    else
        print_warning "前端主进程未运行"
    fi

    if is_watchdog_running; then
        WDPID=$(cat "$WATCHDOG_PID_FILE")
        print_info "终止自动恢复守护 PID: $WDPID"
        kill "$WDPID" 2>/dev/null
        for _ in {1..10}; do
            if ! is_pid_alive "$WDPID"; then
                break
            fi
            sleep 1
        done
        if is_pid_alive "$WDPID"; then
            kill -9 "$WDPID" 2>/dev/null
        fi
    else
        print_warning "自动恢复守护未运行"
    fi

    # 清理可能残留的vite进程（仅限本项目目录）
    pkill -f "$PROJECT_DIR/node_modules/.bin/vite" 2>/dev/null
    if lsof -ti:$PORT > /dev/null 2>&1; then
        kill -9 $(lsof -ti:$PORT) 2>/dev/null
    fi

    rm -f "$PID_FILE" "$WATCHDOG_PID_FILE" "$STOP_FLAG_FILE"

    if ! is_running && ! is_watchdog_running; then
        print_success "前端服务和自动恢复守护均已停止"
        return 0
    fi

    print_error "前端服务停止不完整，请检查进程状态"
    return 1
}

# 重启服务
restart() {
    print_info "正在重启 SCnet 前端服务..."
    stop
    sleep 2
    start
}

# 查看状态
status() {
    echo "================================"
    echo "  SCnet 前端服务状态"
    echo "================================"

    if is_watchdog_running; then
        WDPID=$(cat "$WATCHDOG_PID_FILE")
        print_success "自动恢复守护: 运行中 (PID: $WDPID)"
    else
        print_warning "自动恢复守护: 未运行"
    fi

    echo ""

    if is_running; then
        PID=$(cat "$PID_FILE")
        print_success "前端服务: 运行中 (PID: $PID)"
        echo ""
        echo "进程信息:"
        get_process_info | awk '{printf "  PID: %s\n  父PID: %s\n  CPU: %s%%\n  内存: %s%%\n  运行时间: %s\n", $1, $2, $3, $4, $5}'

        echo ""
        echo "端口信息:"
        lsof -ti:$PORT | xargs -I {} lsof -Pan -p {} -i | grep LISTEN
        echo ""
        echo "访问地址: http://localhost:$PORT"
    else
        print_warning "前端服务: 未运行"
        echo ""
        echo "检查端口 $PORT 占用情况:"
        if lsof -ti:$PORT > /dev/null 2>&1; then
            lsof -ti:$PORT | xargs ps -p
        else
            echo "  端口 $PORT 未被占用"
        fi
    fi

    echo ""
    echo "日志文件: $LOG_FILE"
    echo "最近日志 (最后10行):"
    echo "--------------------------------"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "  无日志文件"
    echo "--------------------------------"
    echo "================================"
}

# 查看日志
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_warning "日志文件不存在: $LOG_FILE"
        return 1
    fi

    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        print_info "实时查看日志 (Ctrl+C 退出):"
        tail -f "$LOG_FILE"
    else
        LINES=${1:-50}
        print_info "显示最后 $LINES 行日志:"
        tail -n "$LINES" "$LOG_FILE"
    fi
}

# 清理日志
clean_logs() {
    if [ -f "$LOG_FILE" ]; then
        print_info "正在清理日志文件: $LOG_FILE"
        > "$LOG_FILE"
        print_success "日志已清理"
    else
        print_warning "日志文件不存在"
    fi
}

# 幂等确保服务在运行（cron 兜底用）
ensure() {
    if is_watchdog_running && is_running; then
        return 0
    fi
    # 守护不在但进程可能残留，先清理
    if ! is_watchdog_running; then
        if is_running; then
            PID=$(cat "$PID_FILE")
            terminate_process_tree "$PID"
        fi
        rm -f "$PID_FILE" "$WATCHDOG_PID_FILE" "$STOP_FLAG_FILE"
        if lsof -ti:$PORT > /dev/null 2>&1; then
            kill -9 $(lsof -ti:$PORT) 2>/dev/null
            sleep 1
        fi
    fi
    start
}

# 显示帮助信息
show_help() {
    cat << __HELP__
SCnet 前端服务管理脚本（支持崩溃自动恢复）

用法: $0 {start|stop|restart|status|logs|clean|help}

命令:
    start       启动前端服务（自动恢复守护）
    stop        停止前端服务和自动恢复守护
    restart     重启前端服务
    status      查看服务状态
    logs [N]    查看日志 (默认50行)
    logs -f     实时查看日志
    clean       清理日志文件
    help        显示此帮助信息

配置:
    项目目录: $PROJECT_DIR
    监听端口: $PORT
    日志文件: $LOG_FILE
    服务PID: $PID_FILE
    守护PID: $WATCHDOG_PID_FILE
    崩溃重启间隔: ${RESTART_DELAY}s

__HELP__
}

# 主程序
main() {
    case "$1" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs "$2"
            ;;
        clean)
            clean_logs
            ;;
        ensure)
            ensure
            ;;
        help|--help|-h)
            show_help
            ;;
        __watchdog)
            watchdog_loop
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
