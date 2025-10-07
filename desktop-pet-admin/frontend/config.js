/**
 * 前端配置文件
 * 根据实际部署情况修改这些配置
 */

window.CONFIG = {
    // API 基础 URL
    API_BASE_URL: 'http://localhost:8080',
    
    // 默认分页大小
    DEFAULT_PAGE_SIZE: 20,
    
    // 自动刷新间隔（毫秒）
    AUTO_REFRESH_INTERVAL: 30000,  // 30秒
    
    // 是否启用自动刷新
    ENABLE_AUTO_REFRESH: true,
    
    // 默认管理员令牌（仅用于开发）
    DEFAULT_ADMIN_TOKEN: 'your_secret_admin_token_here',
    
    // 日期时间格式
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    
    // 表格显示配置
    TABLE_CONFIG: {
        striped: true,
        hover: true,
        responsive: true
    },
    
    // 颜色主题
    THEME: {
        primary: '#667eea',
        success: '#48bb78',
        warning: '#ed8936',
        danger: '#f56565',
        info: '#4299e1'
    }
};

