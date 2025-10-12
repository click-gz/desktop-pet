/**
 * 桌面宠物管理系统前端逻辑
 */

// 全局变量
let adminToken = '';
let currentPage = 1;
let autoRefreshTimer = null;

// ==================== 工具函数 ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== 认证相关 ====================

async function login() {
    const token = document.getElementById('admin-token').value.trim();
    
    if (!token) {
        showNotification('请输入管理员令牌', 'error');
        return;
    }
    
    const loginBtn = document.querySelector('.auth-card .btn');
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    
    loginBtn.disabled = true;
    loginText.classList.add('hidden');
    loginLoading.classList.remove('hidden');
    
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats/overview?token=${token}`);
        
        if (response.ok) {
            adminToken = token;
            localStorage.setItem('adminToken', token);
            
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('main-panel').classList.remove('hidden');
            
            showNotification('登录成功', 'success');
            await loadDashboard();
            startAutoRefresh();
        } else {
            showNotification('令牌无效，请重试', 'error');
        }
    } catch (error) {
        showNotification('连接失败: ' + error.message, 'error');
    } finally {
        loginBtn.disabled = false;
        loginText.classList.remove('hidden');
        loginLoading.classList.add('hidden');
    }
}

function logout() {
    if (confirm('确定要退出登录吗？')) {
        adminToken = '';
        localStorage.removeItem('adminToken');
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-panel').classList.add('hidden');
        stopAutoRefresh();
        showNotification('已退出登录', 'info');
    }
}

// ==================== 自动登录 ====================

window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
        document.getElementById('admin-token').value = savedToken;
        login();
    }
});

// ==================== 仪表板加载 ====================

async function loadDashboard() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats/overview?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            document.getElementById('stat-users').textContent = data.total_users;
            document.getElementById('stat-sessions').textContent = data.total_sessions;
            document.getElementById('stat-messages').textContent = data.total_messages;
            document.getElementById('stat-memory').textContent = data.memory_used;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
    
    await refreshUsers();
}

// ==================== 标签页切换 ====================

function switchTab(tabName) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 显示对应内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // 加载数据
    if (tabName === 'users') refreshUsers();
    else if (tabName === 'pet') {
        refreshPetConfig();
        loadPetStats();
    }
    else if (tabName === 'sessions') refreshSessions();
    else if (tabName === 'system') loadRedisInfo();
}

// ==================== 用户管理 ====================

async function refreshUsers(page = 1) {
    const container = document.getElementById('users-table');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/users?token=${adminToken}&page=${page}&page_size=${window.CONFIG.DEFAULT_PAGE_SIZE}`
        );
        const result = await response.json();
        
        if (result.success) {
            const users = result.data.users;
            currentPage = page;
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>用户ID</th>
                            <th>关系等级</th>
                            <th>亲密度</th>
                            <th>互动次数</th>
                            <th>兴趣标签</th>
                            <th>最后活跃</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            users.forEach(user => {
                const interests = Array.isArray(user.interests) ? user.interests.slice(0, 3).join(', ') : '';
                html += `
                    <tr>
                        <td><code>${user.user_id.substr(0, 12)}...</code></td>
                        <td><span class="badge badge-success">${user.relationship_level}</span></td>
                        <td>${user.intimacy_score}</td>
                        <td>${user.total_interactions}</td>
                        <td>${interests || '-'}</td>
                        <td>${formatDate(user.last_seen)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewUserDetail('${user.user_id}')">
                                详情
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${user.user_id}')">
                                删除
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
            
            // 分页
            renderPagination(result.data);
        }
    } catch (error) {
        container.innerHTML = `<div class="loading">加载失败: ${error.message}</div>`;
    }
}

function renderPagination(data) {
    const container = document.getElementById('users-pagination');
    const { page, total_pages } = data;
    
    let html = `
        <button ${page === 1 ? 'disabled' : ''} onclick="refreshUsers(${page - 1})">
            上一页
        </button>
        <span class="page-info">第 ${page} / ${total_pages} 页</span>
        <button ${page >= total_pages ? 'disabled' : ''} onclick="refreshUsers(${page + 1})">
            下一页
        </button>
    `;
    
    container.innerHTML = html;
}

async function viewUserDetail(userId) {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users/${userId}?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            showModal('用户详情', `
                <div class="modal-body">
                    <h4>基本信息</h4>
                    <p><strong>用户ID:</strong> ${data.profile.user_id}</p>
                    <p><strong>创建时间:</strong> ${formatDate(data.profile.created_at)}</p>
                    <p><strong>最后活跃:</strong> ${formatDate(data.profile.last_seen)}</p>
                    <p><strong>互动次数:</strong> ${data.profile.total_interactions}</p>
                    <p><strong>亲密度:</strong> ${data.profile.intimacy_score}</p>
                    <p><strong>关系等级:</strong> ${data.profile.relationship_level}</p>
                    
                    <h4 style="margin-top: 20px;">兴趣标签</h4>
                    <p>${Array.isArray(data.profile.interests) && data.profile.interests.length > 0 
                        ? data.profile.interests.join(', ') 
                        : '暂无'}</p>
                    
                    <div style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="viewCompleteProfile('${userId}')">
                            📊 查看完整用户画像
                        </button>
                        <button class="btn btn-warning" onclick="refreshUserProfile('${userId}')" style="margin-left: 10px;">
                            🔄 刷新画像
                        </button>
                    </div>
                    
                    <h4 style="margin-top: 20px;">聊天历史 (最近10条)</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${data.chat_history.slice(-10).map(msg => `
                            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <strong>${msg.role === 'user' ? '👤 用户' : '🐱 助手'}:</strong>
                                <p style="margin-top: 5px;">${msg.content}</p>
                            </div>
                        `).join('') || '暂无聊天记录'}
                    </div>
                </div>
            `);
        }
    } catch (error) {
        showNotification('获取用户详情失败', 'error');
    }
}

async function viewCompleteProfile(userId) {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users/${userId}/profile?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const profile = result.data;
            const demo = profile.demographics || {};
            const interests = profile.interests || {};
            const psych = profile.psychological || {};
            const social = profile.social || {};
            const stats = profile.statistics || {};
            
            showModal('完整用户画像', `
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <!-- 基础属性层 -->
                    <h3 style="color: #4299e1; margin-top: 0;">👤 基础属性</h3>
                    <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>年龄段:</strong> ${demo.age_range || '未知'}</p>
                            <p><strong>性别:</strong> ${demo.gender === 'male' ? '男性' : demo.gender === 'female' ? '女性' : '未知'}</p>
                            <p><strong>职业:</strong> ${demo.occupation || '未知'}</p>
                            <p><strong>教育程度:</strong> ${demo.education || '未知'}</p>
                            <p><strong>地理位置:</strong> ${demo.location || '未知'}</p>
                            <p><strong>设备类型:</strong> ${demo.device_type || 'PC'}</p>
                        </div>
                        ${demo.confidence_scores ? `
                            <p style="margin-top: 10px; font-size: 12px; color: #718096;">
                                置信度: 年龄 ${(demo.confidence_scores.age * 100).toFixed(0)}%, 
                                性别 ${(demo.confidence_scores.gender * 100).toFixed(0)}%, 
                                职业 ${(demo.confidence_scores.occupation * 100).toFixed(0)}%
                            </p>
                        ` : ''}
                    </div>
                    
                    <!-- 兴趣偏好层 -->
                    <h3 style="color: #48bb78;">🎯 兴趣偏好</h3>
                    <div style="background: #f0fff4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0;">兴趣标签</h4>
                        <div style="margin-bottom: 10px;">
                            ${interests.interest_tags && Object.keys(interests.interest_tags).length > 0 
                                ? Object.entries(interests.interest_tags).map(([tag, data]) => `
                                    <span style="display: inline-block; background: #48bb78; color: white; padding: 5px 12px; border-radius: 20px; margin: 3px; font-size: 14px;">
                                        ${tag} ${data.weight ? `(${(data.weight * 100).toFixed(0)}%)` : ''}
                                    </span>
                                `).join('')
                                : '<span style="color: #a0aec0;">暂无兴趣标签</span>'}
                        </div>
                        
                        <h4>内容偏好</h4>
                        ${interests.content_preferences ? `
                            <p>📏 回复长度偏好: <strong>${interests.content_preferences.response_length || '中等'}</strong></p>
                            <p>😊 使用表情: <strong>${interests.content_preferences.use_emoji ? '是' : '否'}</strong></p>
                            <p>📚 喜欢举例: <strong>${interests.content_preferences.use_examples ? '是' : '否'}</strong></p>
                        ` : '<p style="color: #a0aec0;">暂无偏好数据</p>'}
                        
                        ${interests.peak_active_hours && interests.peak_active_hours.length > 0 ? `
                            <p>⏰ 活跃时段: <strong>${interests.peak_active_hours.join(', ')}点</strong></p>
                        ` : ''}
                    </div>
                    
                    <!-- 心理特征层 -->
                    <h3 style="color: #9f7aea;">🧠 心理特征</h3>
                    <div style="background: #faf5ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0;">大五人格</h4>
                        ${psych.big_five_personality ? `
                            <div style="margin-bottom: 15px;">
                                ${renderPersonalityBar('开放性', psych.big_five_personality.openness)}
                                ${renderPersonalityBar('尽责性', psych.big_five_personality.conscientiousness)}
                                ${renderPersonalityBar('外向性', psych.big_five_personality.extraversion)}
                                ${renderPersonalityBar('宜人性', psych.big_five_personality.agreeableness)}
                                ${renderPersonalityBar('神经质', psych.big_five_personality.neuroticism)}
                            </div>
                        ` : '<p style="color: #a0aec0;">暂无人格数据</p>'}
                        
                        <h4>情感状态</h4>
                        ${psych.emotional_state ? `
                            <p>😊 当前情绪: <strong>${getMoodEmoji(psych.emotional_state.current_mood)} ${getMoodText(psych.emotional_state.current_mood)}</strong></p>
                            <p>📊 情绪稳定性: <strong>${(psych.emotional_state.emotional_stability * 100).toFixed(0)}%</strong></p>
                            <p>😄 积极情绪占比: <strong>${(psych.emotional_state.positive_ratio * 100).toFixed(0)}%</strong></p>
                            <p>💪 压力水平: <strong>${psych.emotional_state.stress_level || '未知'}</strong></p>
                        ` : '<p style="color: #a0aec0;">暂无情感数据</p>'}
                        
                        <h4>沟通风格</h4>
                        ${psych.communication_style ? `
                            <p>💬 风格: <strong>${psych.communication_style.formality === 'formal' ? '正式' : '随意'}</strong></p>
                            <p>😄 幽默接受度: <strong>${(psych.communication_style.humor_appreciation * 100).toFixed(0)}%</strong></p>
                            <p>📝 平均消息长度: <strong>${psych.communication_style.avg_message_length || 0}字</strong></p>
                        ` : '<p style="color: #a0aec0;">暂无沟通风格数据</p>'}
                    </div>
                    
                    <!-- 社交关系层 -->
                    <h3 style="color: #ed8936;">💕 社交关系</h3>
                    <div style="background: #fffaf0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        ${social.ai_relationship ? `
                            <p>❤️ 亲密度分数: <strong>${social.ai_relationship.intimacy_score || 0}</strong></p>
                            <p>🤝 关系等级: <strong>${social.ai_relationship.relationship_level || '陌生人'}</strong></p>
                            <p>🔒 信任程度: <strong>${(social.ai_relationship.trust_level * 100).toFixed(0)}%</strong></p>
                            <p>🤗 互动舒适度: <strong>${(social.ai_relationship.interaction_comfort * 100).toFixed(0)}%</strong></p>
                        ` : '<p style="color: #a0aec0;">暂无关系数据</p>'}
                        
                        ${social.interaction_patterns ? `
                            <h4>互动模式</h4>
                            <p>⏱️ 平均会话时长: <strong>${social.interaction_patterns.avg_session_duration || 0}分钟</strong></p>
                            <p>💬 平均会话消息数: <strong>${social.interaction_patterns.avg_messages_per_session || 0}条</strong></p>
                        ` : ''}
                    </div>
                    
                    <!-- 统计信息 -->
                    <h3 style="color: #667eea;">📊 统计信息</h3>
                    <div style="background: #edf2f7; padding: 15px; border-radius: 8px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>总互动次数:</strong> ${stats.total_interactions || 0}</p>
                            <p><strong>总会话数:</strong> ${stats.total_sessions || 0}</p>
                            <p><strong>总消息数:</strong> ${stats.total_messages || 0}</p>
                            <p><strong>注册天数:</strong> ${stats.days_since_registration || 0}天</p>
                            <p><strong>连续活跃:</strong> ${stats.continuous_active_days || 0}天</p>
                            <p><strong>最长沉默:</strong> ${stats.longest_inactive_days || 0}天</p>
                        </div>
                    </div>
                    
                    <p style="margin-top: 20px; text-align: center; color: #a0aec0; font-size: 12px;">
                        最后更新: ${formatDate(profile.last_updated)}
                    </p>
                </div>
            `, 'large');
        } else {
            showNotification('暂无增强画像数据', 'info');
        }
    } catch (error) {
        showNotification('获取画像失败: ' + error.message, 'error');
    }
}

function renderPersonalityBar(label, value) {
    const percentage = (value * 100).toFixed(0);
    return `
        <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 3px;">
                <span>${label}</span>
                <span>${percentage}%</span>
            </div>
            <div style="background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #9f7aea, #b794f4); height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
            </div>
        </div>
    `;
}

function getMoodEmoji(mood) {
    const moodMap = {
        'very_happy': '😄',
        'happy': '😊',
        'neutral': '😐',
        'sad': '😢',
        'anxious': '😰',
        'angry': '😠',
        'excited': '🤩',
        'tired': '😴'
    };
    return moodMap[mood] || '😐';
}

function getMoodText(mood) {
    const textMap = {
        'very_happy': '非常开心',
        'happy': '开心',
        'neutral': '平静',
        'sad': '难过',
        'anxious': '焦虑',
        'angry': '生气',
        'excited': '兴奋',
        'tired': '疲惫'
    };
    return textMap[mood] || '平静';
}

async function refreshUserProfile(userId) {
    if (!confirm('确定要刷新该用户的画像吗？这将立即触发画像分析。')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/users/${userId}/refresh_profile?token=${adminToken}`,
            { method: 'POST' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message || '画像刷新已触发，请稍后查看', 'success');
        }
    } catch (error) {
        showNotification('刷新失败: ' + error.message, 'error');
    }
}

async function confirmDeleteUser(userId) {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/users/${userId}?token=${adminToken}`,
            { method: 'DELETE' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification('删除成功', 'success');
            refreshUsers(currentPage);
            loadDashboard();
        }
    } catch (error) {
        showNotification('删除失败: ' + error.message, 'error');
    }
}

// ==================== 会话管理 ====================

async function refreshSessions() {
    const container = document.getElementById('sessions-table');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    const status = document.getElementById('session-status-filter')?.value || '';
    
    try {
        const url = `${window.CONFIG.API_BASE_URL}/api/admin/sessions?token=${adminToken}${status ? '&status=' + status : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const sessions = result.data.sessions;
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>会话ID</th>
                            <th>用户ID</th>
                            <th>状态</th>
                            <th>消息数</th>
                            <th>开始时间</th>
                            <th>最后活跃</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            sessions.forEach(session => {
                const statusBadge = 
                    session.status === 'active' ? 'badge-success' :
                    session.status === 'ended' ? 'badge-warning' : 'badge-info';
                
                html += `
                    <tr>
                        <td><code>${session.session_id.substr(0, 12)}...</code></td>
                        <td><code>${session.user_id.substr(0, 12)}...</code></td>
                        <td><span class="badge ${statusBadge}">${session.status}</span></td>
                        <td>${session.message_count}</td>
                        <td>${formatDate(session.start_time)}</td>
                        <td>${formatDate(session.last_active)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewSessionDetail('${session.session_id}')">
                                详情
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="confirmDeleteSession('${session.session_id}')">
                                删除
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    } catch (error) {
        container.innerHTML = `<div class="loading">加载失败: ${error.message}</div>`;
    }
}

function filterSessions() {
    refreshSessions();
}

async function viewSessionDetail(sessionId) {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/sessions/${sessionId}?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            showModal('会话详情', `
                <div class="modal-body">
                    <h4>会话信息</h4>
                    <p><strong>会话ID:</strong> ${data.session.session_id}</p>
                    <p><strong>用户ID:</strong> ${data.session.user_id}</p>
                    <p><strong>状态:</strong> ${data.session.status}</p>
                    <p><strong>消息数:</strong> ${data.session.message_count}</p>
                    <p><strong>开始时间:</strong> ${formatDate(data.session.start_time)}</p>
                    
                    <h4 style="margin-top: 20px;">对话内容</h4>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${data.context.map(msg => `
                            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <strong>${msg.role === 'user' ? '👤 用户' : '🐱 助手'}:</strong>
                                <p style="margin-top: 5px;">${msg.content}</p>
                                <small style="color: #999;">${formatDate(msg.timestamp)}</small>
                            </div>
                        `).join('') || '暂无对话'}
                    </div>
                </div>
            `);
        }
    } catch (error) {
        showNotification('获取会话详情失败', 'error');
    }
}

async function confirmDeleteSession(sessionId) {
    if (!confirm('确定要删除该会话吗？')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/sessions/${sessionId}?token=${adminToken}`,
            { method: 'DELETE' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification('删除成功', 'success');
            refreshSessions();
            loadDashboard();
        }
    } catch (error) {
        showNotification('删除失败: ' + error.message, 'error');
    }
}

// ==================== 系统信息 ====================

async function loadRedisInfo() {
    const container = document.getElementById('redis-info');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/redis/info?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            container.innerHTML = `
                <div class="info-card">
                    <h4>服务器信息</h4>
                    <p><strong>Redis 版本:</strong> ${data.server.redis_version}</p>
                    <p><strong>操作系统:</strong> ${data.server.os}</p>
                    <p><strong>运行天数:</strong> ${data.server.uptime_in_days} 天</p>
                </div>
                <div class="info-card">
                    <h4>内存信息</h4>
                    <p><strong>已用内存:</strong> ${data.memory.used_memory_human}</p>
                    <p><strong>峰值内存:</strong> ${data.memory.used_memory_peak_human}</p>
                    <p><strong>碎片率:</strong> ${data.memory.mem_fragmentation_ratio}</p>
                </div>
                <div class="info-card">
                    <h4>统计信息</h4>
                    <p><strong>连接总数:</strong> ${data.stats.total_connections_received}</p>
                    <p><strong>命令总数:</strong> ${data.stats.total_commands_processed}</p>
                    <p><strong>缓存命中:</strong> ${data.stats.keyspace_hits}</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `<div class="loading">加载失败: ${error.message}</div>`;
    }
}

async function cleanupData() {
    if (!confirm('确定要清理过期数据吗？')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/redis/cleanup?token=${adminToken}`,
            { method: 'POST' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            loadDashboard();
        }
    } catch (error) {
        showNotification('清理失败: ' + error.message, 'error');
    }
}

async function confirmFlushDatabase() {
    if (!confirm('⚠️ 警告！此操作将清空所有数据，不可恢复！确定继续吗？')) return;
    if (!confirm('请再次确认：真的要清空整个数据库吗？')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/admin/redis/flush?token=${adminToken}&confirm=CONFIRM_FLUSH_ALL`,
            { method: 'DELETE' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification('数据库已清空', 'success');
            loadDashboard();
        }
    } catch (error) {
        showNotification('清空失败: ' + error.message, 'error');
    }
}

// ==================== 模态框 ====================

function showModal(title, content, size = 'normal') {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    
    // 根据尺寸调整样式
    if (size === 'large') {
        container.style.maxWidth = '90vw';
        container.style.width = '1200px';
    } else {
        container.style.maxWidth = '600px';
        container.style.width = '90%';
    }
    
    container.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        ${content}
    `;
    
    overlay.classList.remove('hidden');
    container.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').classList.add('hidden');
}

// ==================== 自动刷新 ====================

function startAutoRefresh() {
    if (window.CONFIG.ENABLE_AUTO_REFRESH) {
        autoRefreshTimer = setInterval(() => {
            loadDashboard();
        }, window.CONFIG.AUTO_REFRESH_INTERVAL);
    }
}

function stopAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
}

function refreshAll() {
    loadDashboard();
    showNotification('已刷新', 'success');
}

// 页面卸载时停止自动刷新
window.addEventListener('beforeunload', stopAutoRefresh);

// ==================== 宠物配置管理 ====================

async function refreshPetConfig() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/pet/config?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const config = result.data;
            
            // 填充表单
            document.getElementById('pet-name').value = config.pet_name || '';
            document.getElementById('pet-personality').value = config.personality || '';
            document.getElementById('pet-greeting').value = config.greeting_message || '';
            document.getElementById('pet-system-prompt').value = config.system_prompt || '';
            document.getElementById('pet-avatar-style').value = config.avatar_style || 'cat';
            document.getElementById('pet-voice-enabled').checked = config.voice_enabled || false;
            
            showNotification('配置已加载', 'success');
        }
    } catch (error) {
        showNotification('加载配置失败: ' + error.message, 'error');
    }
}

async function savePetConfig() {
    try {
        // 获取表单数据
        const petName = document.getElementById('pet-name').value.trim();
        const personality = document.getElementById('pet-personality').value.trim();
        const greeting = document.getElementById('pet-greeting').value.trim();
        const systemPrompt = document.getElementById('pet-system-prompt').value.trim();
        const avatarStyle = document.getElementById('pet-avatar-style').value;
        const voiceEnabled = document.getElementById('pet-voice-enabled').checked;
        
        // 验证必填字段
        if (!petName) {
            showNotification('请输入宠物名称', 'error');
            return;
        }
        
        if (!systemPrompt) {
            showNotification('请输入 System Prompt', 'error');
            return;
        }
        
        // 构建更新数据
        const updateData = {
            pet_name: petName,
            personality: personality,
            greeting_message: greeting,
            system_prompt: systemPrompt,
            avatar_style: avatarStyle,
            voice_enabled: voiceEnabled
        };
        
        // 发送更新请求
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/pet/config?token=${adminToken}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            }
        );
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ 配置保存成功！', 'success');
            await loadPetStats(); // 重新加载统计信息
        } else {
            showNotification('保存失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        showNotification('保存失败: ' + error.message, 'error');
    }
}

async function resetPetConfig() {
    if (!confirm('确定要重置为默认配置吗？当前配置将丢失！')) return;
    
    try {
        const response = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/pet/config/reset?token=${adminToken}`,
            { method: 'POST' }
        );
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ 已重置为默认配置', 'success');
            await refreshPetConfig();
            await loadPetStats();
        }
    } catch (error) {
        showNotification('重置失败: ' + error.message, 'error');
    }
}

async function loadPetStats() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/pet/stats?token=${adminToken}`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            
            // 更新统计数据
            document.getElementById('pet-stat-interactions').textContent = stats.total_interactions || 0;
            document.getElementById('pet-stat-users').textContent = stats.unique_users || 0;
            document.getElementById('pet-stat-sessions').textContent = stats.total_sessions || 0;
            document.getElementById('pet-stat-updated').textContent = stats.config_last_updated 
                ? formatDate(stats.config_last_updated) 
                : '从未更新';
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

