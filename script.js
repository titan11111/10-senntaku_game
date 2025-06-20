document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const mainScreen = document.getElementById('main-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const maouWinScreen = document.getElementById('maou-win-screen');

    const displayPoints = document.getElementById('display-points');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const maouBattleBtn = document.getElementById('maou-battle-btn');
    const resetPointsBtn = document.getElementById('reset-points-btn');
    const mainMessage = document.getElementById('main-message');

    const quizCategoryTitle = document.getElementById('quiz-category-title');
    const timeLeftSpan = document.getElementById('time-left');
    const currentQuestionNumSpan = document.getElementById('current-question-num');
    const enemyImage = document.getElementById('enemy-image');
    const questionText = document.getElementById('question-text');
    const optionButtons = document.querySelectorAll('.option-btn');
    const skipQuestionBtn = document.getElementById('skip-question-btn');

    const finalScoreSpan = document.getElementById('final-score');
    const correctAnswersCountSpan = document.getElementById('correct-answers-count');
    const resultMessage = document.getElementById('result-message');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');

    // --- オーディオ要素の取得 ---
    const fieldAudio = document.getElementById('field-audio');
    const seikaiAudio = document.getElementById('seikai-audio');
    const fuseikaiAudio = document.getElementById('fuseikai-audio');
    const levelupAudio = document.getElementById('levelup-audio');
    const maouAudio = document.getElementById('maou-audio');
    const sentouAudio = document.getElementById('sentou-audio');

    // --- ゲームの状態変数 ---
    let totalPoints = 0;
    let allQuizData = {}; // 全クイズデータ
    let currentQuizData = []; // 現在のカテゴリのクイズデータ
    let currentQuestionIndex = 0;
    let correctAnswersInQuiz = 0;
    let quizCategory = '';
    let isMaouBattle = false;
    let timer;
    let timeLeft = 10;
    const QUIZ_QUESTIONS_PER_CATEGORY = 5;
    const POINTS_PER_CORRECT_ANSWER = 10;
    const POINTS_TO_UNLOCK_MAOU = 30; // 魔王戦解放に必要なポイント
    let clearedCategories = []; // クリアしたカテゴリを保存する配列

    // --- 効果音関連のパス（必要に応じて調整） ---
    const AUDIO_PATHS = {
        field: 'audio/field.mp3',
        seikai: 'audio/seikai2.mp3',
        fuseikai: 'audio/fuseikai2.mp3',
        levelup: 'audio/levelup.mp3',
        maou: 'audio/maou.mp3',
        sentou: 'audio/sentou.mp3',
    };

    // --- 画像パス ---
    const ENEMY_IMAGES = {
        normal: ['images/enemy1.png', 'images/enemy2.png', 'images/enemy3.png', 'images/enemy4.png'],
        maou: 'images/maou.png',
        hero: 'images/hero.png' // 魔王撃破時に使う勇者の画像
    };

    // --- 画面切り替え関数 ---
    function showScreen(screenToShow) {
        const screens = [mainScreen, quizScreen, resultScreen, maouWinScreen];
        screens.forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });
    }

    // --- オーディオ再生関数 ---
    function playAudio(audioElement, loop = false) {
        // 現在再生中のループ音があれば停止
        if (fieldAudio.loop && fieldAudio.currentTime > 0 && fieldAudio !== audioElement) {
            fieldAudio.pause();
            fieldAudio.currentTime = 0;
        }
        if (sentouAudio.loop && sentouAudio.currentTime > 0 && sentouAudio !== audioElement) {
            sentouAudio.pause();
            sentouAudio.currentTime = 0;
        }
        if (maouAudio.loop && maouAudio.currentTime > 0 && maouAudio !== audioElement) {
            maouAudio.pause();
            maouAudio.currentTime = 0;
        }

        audioElement.loop = loop;
        audioElement.play().catch(error => console.error("Audio play failed:", error));
    }

    function stopAllAudio() {
        [fieldAudio, seikaiAudio, fuseikaiAudio, levelupAudio, maouAudio, sentouAudio].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    // --- ゲームデータの保存と読み込み ---
    function saveGameData() {
        localStorage.setItem('totalPoints', totalPoints);
        localStorage.setItem('clearedCategories', JSON.stringify(clearedCategories)); // クリアしたカテゴリを保存
    }

    function loadGameData() {
        const savedPoints = localStorage.getItem('totalPoints');
        if (savedPoints !== null) {
            totalPoints = parseInt(savedPoints, 10);
        }
        const savedClearedCategories = localStorage.getItem('clearedCategories');
        if (savedClearedCategories) {
            clearedCategories = JSON.parse(savedClearedCategories);
        }
    }

    // --- メイン画面の更新 ---
    function updateMainScreen() {
        displayPoints.textContent = totalPoints;
        const remainingPoints = POINTS_TO_UNLOCK_MAOU - totalPoints;
        if (totalPoints >= POINTS_TO_UNLOCK_MAOU) {
            maouBattleBtn.disabled = false;
            mainMessage.textContent = '魔王に挑戦できるぞ！';
        } else {
            maouBattleBtn.disabled = true;
            mainMessage.textContent = `あと${remainingPoints}ポイントで魔王に挑戦できるぞ！`;
        }

        // カテゴリボタンの表示更新
        categoryButtons.forEach(button => {
            const category = button.dataset.category;
            if (clearedCategories.includes(category)) {
                button.classList.add('cleared-category');
                button.textContent = `${category} (クリア済み)`; // テキストも変更
                button.disabled = true; // クリア済みは選択不可に
            } else {
                button.classList.remove('cleared-category');
                button.textContent = category; // 元のテキストに戻す
                button.disabled = false; // 未クリアは選択可能に
            }
        });

        playAudio(fieldAudio, true); // メイン画面ではフィールドBGM
    }

    // --- ゲーム初期化 ---
    async function initializeGame() {
        loadGameData(); // ポイントとクリアカテゴリをロード
        if (Object.keys(allQuizData).length === 0) {
            try {
                const response = await fetch('quizData.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                allQuizData = await response.json();
                console.log("Quiz data loaded:", allQuizData);
            } catch (error) {
                console.error("Failed to load quiz data:", error);
                alert("クイズデータの読み込みに失敗しました。ページをリロードしてください。");
                return;
            }
        }
        updateMainScreen();
        showScreen(mainScreen);
    }

    // --- クイズ開始 ---
    async function startQuiz(category) {
        stopAllAudio(); // クイズ開始時にBGMを一旦停止

        quizCategory = category;
        isMaouBattle = (category === 'Maou');

        if (isMaouBattle) {
            enemyImage.src = ENEMY_IMAGES.maou;
            playAudio(maouAudio, true);
        } else {
            // 通常カテゴリの場合、ランダムな敵画像
            const randomIndex = Math.floor(Math.random() * ENEMY_IMAGES.normal.length);
            enemyImage.src = ENEMY_IMAGES.normal[randomIndex];
            playAudio(sentouAudio, true);
        }

        const availableQuestions = allQuizData[quizCategory];

        if (!availableQuestions || availableQuestions.length === 0) {
            alert("このカテゴリのクイズデータが見つかりません。");
            showScreen(mainScreen);
            playAudio(fieldAudio, true);
            return;
        }

        if (!isMaouBattle && availableQuestions.length < QUIZ_QUESTIONS_PER_CATEGORY) {
            alert(`「${quizCategory}」カテゴリは問題数が少ないため、現在プレイできません。別のカテゴリを選んでください。（最低${QUIZ_QUESTIONS_PER_CATEGORY}問必要）`);
            showScreen(mainScreen);
            playAudio(fieldAudio, true);
            return;
        }

        // 問題をシャッフルして必要な数だけ取得
        const shuffledQuestions = [...availableQuestions].sort(() => Math.random() - 0.5);
        currentQuizData = shuffledQuestions.slice(0, QUIZ_QUESTIONS_PER_CATEGORY);

        currentQuestionIndex = 0;
        correctAnswersInQuiz = 0;
        quizCategoryTitle.textContent = `${quizCategory}クイズ`;
        timeLeft = 10; // 各問題の制限時間初期化

        showScreen(quizScreen);
        loadQuestion();
    }

    // --- 問題を読み込む ---
    function loadQuestion() {
        stopTimer(); // 前のタイマーを停止

        if (currentQuestionIndex >= QUIZ_QUESTIONS_PER_CATEGORY) {
            endQuiz();
            return;
        }

        resetOptionsStyle();
        const question = currentQuizData[currentQuestionIndex];
        
        // questionがundefinedでないことを確認
        if (!question) {
            console.error("Error: Question is undefined at index", currentQuestionIndex);
            endQuiz(); // 問題が読み込めない場合はクイズを終了
            return;
        }

        questionText.textContent = question.question;
        question.options.forEach((option, index) => {
            optionButtons[index].textContent = option;
            optionButtons[index].disabled = false; // ボタンを有効化
        });

        currentQuestionNumSpan.textContent = currentQuestionIndex + 1;
        startTimer();
    }

    // --- 解答を処理する ---
    function handleAnswer(selectedIndex) {
        stopTimer();
        const question = currentQuizData[currentQuestionIndex];
        const correctAnswerIndex = question.correct;

        // 全ての選択肢を無効化
        optionButtons.forEach(button => button.disabled = true);

        if (selectedIndex === correctAnswerIndex) {
            correctAnswersInQuiz++;
            totalPoints += POINTS_PER_CORRECT_ANSWER;
            playAudio(seikaiAudio);
            optionButtons[selectedIndex].classList.add('correct');
        } else {
            playAudio(fuseikaiAudio);
            optionButtons[selectedIndex].classList.add('wrong');
            optionButtons[correctAnswerIndex].classList.add('correct'); // 正解を表示
        }

        saveGameData(); // ポイントを保存
        updateMainScreen(); // メイン画面のポイント表示を更新

        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
        }, 1500); // 1.5秒後に次の問題へ
    }

    // --- 選択肢のスタイルをリセット ---
    function resetOptionsStyle() {
        optionButtons.forEach(button => {
            button.classList.remove('correct', 'wrong');
            button.disabled = false;
        });
    }

    // --- タイマー機能 ---
    function startTimer() {
        timeLeft = 10; // 各問題の時間をリセット
        timeLeftSpan.textContent = timeLeft;
        timer = setInterval(() => {
            timeLeft--;
            timeLeftSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleAnswer(-1); // 時間切れの場合、不正解として処理
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timer);
    }

    // --- クイズ終了 ---
    function endQuiz() {
        stopTimer();
        stopAllAudio(); // クイズ終了時にもBGMを停止

        finalScoreSpan.textContent = totalPoints;
        correctAnswersCountSpan.textContent = correctAnswersInQuiz;

        if (isMaouBattle) {
            if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY) { // 魔王戦は全問正解で勝利
                showScreen(maouWinScreen);
                mainMessage.textContent = '魔王を撃破したぞ！';
                localStorage.setItem('maouDefeated', 'true'); // 魔王撃破状態を保存
                playAudio(levelupAudio); // レベルアップ音を再生
            } else {
                showScreen(resultScreen);
                resultMessage.textContent = '魔王には及ばなかった...。修行を重ねてまた挑もう！';
                playAudio(fieldAudio, true); // 敗北時はフィールドBGM
            }
        } else {
            let message = '';
            if (correctAnswersInQuiz === QUIZ_QUESTIONS_PER_CATEGORY) {
                message = '全問正解！素晴らしい！';
                playAudio(levelupAudio); // レベルアップ音を再生
                // カテゴリをクリア済みにする
                if (!clearedCategories.includes(quizCategory)) {
                    clearedCategories.push(quizCategory);
                    saveGameData(); // クリア状態を保存
                }
            } else if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY / 2) {
                message = 'よく頑張った！もう少しだ！';
                playAudio(fieldAudio, true); // フィールドBGMに戻す
            } else {
                message = '残念！また挑戦して知識を深めよう！';
                playAudio(fieldAudio, true); // フィールドBGMに戻す
            }
            resultMessage.textContent = message;
            showScreen(resultScreen);
        }
        updateMainScreen(); // メイン画面の表示を更新（カテゴリボタンの表示も更新される）
    }

    // --- ポイントリセット ---
    function resetPoints() {
        if (confirm('本当にポイントをリセットしますか？')) {
            totalPoints = 0;
            clearedCategories = []; // クリアカテゴリもリセット
            localStorage.removeItem('maouDefeated'); // 魔王撃破状態もリセット
            saveGameData();
            updateMainScreen();
            mainMessage.textContent = 'ポイントとクリア情報がリセットされたぞ！';
        }
    }

    // --- デバッグ機能：問題スキップ ---
    function skipQuestion() {
        if (confirm('現在の問題をスキップして次の問題に進みますか？')) {
            stopTimer();
            currentQuestionIndex++;
            loadQuestion();
        }
    }

    // --- イベントリスナー ---
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            startQuiz(button.dataset.category);
        });
    });

    maouBattleBtn.addEventListener('click', () => {
        if (totalPoints >= POINTS_TO_UNLOCK_MAOU) {
            startQuiz('Maou');
        } else {
            alert(`魔王に挑戦するには、あと${POINTS_TO_UNLOCK_MAOU - totalPoints}ポイント必要だ！`);
        }
    });

    optionButtons.forEach((button, index) => {
        button.addEventListener('click', () => handleAnswer(index));
    });

    backToMainBtn.addEventListener('click', () => {
        showScreen(mainScreen);
        playAudio(fieldAudio, true);
    });

    restartGameBtn.addEventListener('click', () => {
        if (confirm('ゲームを最初からやり直しますか？現在のポイントもリセットされます。')) {
            totalPoints = 0;
            clearedCategories = []; // クリアカテゴリもリセット
            localStorage.removeItem('maouDefeated'); // 魔王撃破状態もリセット
            saveGameData();
            initializeGame(); // 全体を初期化してメイン画面へ
        }
    });

    resetPointsBtn.addEventListener('click', resetPoints);
    skipQuestionBtn.addEventListener('click', skipQuestion); // デバッグ用スキップボタン

    // ゲーム開始
    initializeGame();
});
