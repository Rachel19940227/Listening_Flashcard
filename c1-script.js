document.addEventListener('DOMContentLoaded', async () => {
    // 初始化Supabase客户端
    const { createClient } = supabase;
    
    const SUPABASE_URL = 'https://ljcnyljxxrnzqflvumcv.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY255bGp4eHJuenFmbHZ1bWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NTg2NDksImV4cCI6MjA1NzUzNDY0OX0.q5LzNGG1yqHM01RYpoSmOuN4DCV5Vd_ksTTNPbni7JA';

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 全局状态变量
    let currentQuestion = 1;
    let allQuestions = [];
    let totalQuestions = 0;

    // 缓存DOM元素（添加null检查）
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el) console.error(`元素 ${id} 未找到`);
        return el;
    };

    const progressBar = getElement('progress');
    const questionNumber = getElement('question-number');
    const audioPlayer = getElement('audio-player');
    const audioSource = getElement('audio-source');

    // 加载状态管理
    function showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(overlay);
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        overlay?.remove();
    }

    // 数据加载（添加进度条检查）
    async function loadQuestions() {
        showLoading();
        try {
            const { data, error } = await supabaseClient
                .from('coc1')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            
            allQuestions = data;
            totalQuestions = data.length;
            
            // 添加进度条存在检查
            if (progressBar) {
                progressBar.max = totalQuestions;
                progressBar.min = 1;
            } else {
                console.error('进度条元素未找到');
            }
            
        } catch (err) {
            console.error('数据加载失败:', err);
            alert('题目加载失败，请刷新重试');
        } finally {
            hideLoading();
        }
    }

    // 卡片操作（使用事件委托）
    function handleCardClick() {
        document.querySelector('.card').classList.toggle('flipped');
    }

    function resetCard() {
        document.querySelector('.card').classList.remove('flipped');
    }

    // 题目导航（添加边界检查）
    function nextQuestion() {
        if (currentQuestion < totalQuestions) {
            currentQuestion++;
            updateUI();
        } else {
            console.log('已经是最后一题');
        }
    }

    function prevQuestion() {
        if (currentQuestion > 1) {
            currentQuestion--;
            updateUI();
        } else {
            console.log('已经是第一题');
        }
    }

    // 更新界面（添加DOM检查）
    function updateUI() {
        resetCard();
        try {
            updateQuestionContent();
            updateProgress();
        } catch (err) {
            console.error('界面更新失败:', err);
        }
    }

    function updateQuestionContent() {
        if (!allQuestions.length) {
            console.warn('题目数据为空');
            return;
        }

        const question = allQuestions[currentQuestion - 1];
        if (!question) {
            console.error(`未找到第 ${currentQuestion} 题`);
            return;
        }

        // 安全更新DOM内容
        const safeUpdate = (elementId, content) => {
            const el = getElement(elementId);
            if (el) el.innerHTML = content;
        };

        // 仅更新正面内容
        const optionsHTML = question.options.split('\n').map(opt => {
            return `<div class="option-item">${opt}</div>`;
        }).join('');
        
        safeUpdate('question-content', optionsHTML);
        
        // 仅更新背面内容
        safeUpdate('answer-content', `
            <div class="correct-answer">
                <span class="answer-label">正确答案：</span>
                <span class="answer-value">${question.answer}</span>
            </div>
        `);
        safeUpdate('transcript', question.transcript);

        // 更新音频
        if (audioSource) {
            const audioUrl = supabaseClient.storage
                .from('coc1')
                .getPublicUrl(question.audio_name).data.publicUrl;
            
            audioSource.src = audioUrl;
            audioPlayer.load();
    
            // **尝试自动播放**
            audioPlayer.play().catch(error => {
                console.log("自动播放被阻止，等待用户交互", error);
            });
        }
    }

    function updateProgress() {
        if (questionNumber) {
            questionNumber.textContent = `${currentQuestion}/${totalQuestions}`;
        }
        if (progressBar) {
            progressBar.value = currentQuestion;
        }
    }

    function bindEvents() {
        // 直接绑定卡片点击事件
        const card = document.querySelector('.card');
        card.addEventListener('click', (e) => {
            // 排除音频控件及其子元素的点击
            if (!e.target.closest('#audio-player')) {
                card.classList.toggle('flipped');
            }
        });
    
        // 导航按钮事件
        document.querySelector('.next-button').addEventListener('click', nextQuestion);
        document.querySelector('.prev-button').addEventListener('click', prevQuestion);
    
        // 转写文本切换
        document.querySelector('.toggle-btn').addEventListener('click', toggleTranscript);
    
        // 进度条事件
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const newValue = parseInt(e.target.value);
                if (newValue >= 1 && newValue <= totalQuestions) {
                    currentQuestion = newValue;
                    updateUI();
                }
            });
        }
    }

    // 切换转写文本
    function toggleTranscript() {
        const transcript = getElement('transcript');
        const button = document.querySelector('.toggle-btn');
        if (transcript && button) {
            transcript.classList.toggle('show');
            button.textContent = transcript.classList.contains('show') 
                ? '隐藏转写文本' 
                : '显示转写文本';
        }
    }

    // 初始化流程
    try {
        await loadQuestions();
        updateUI();
        bindEvents();
    } catch (err) {
        console.error('初始化失败:', err);
        alert('页面初始化失败，请检查控制台');
    }
});