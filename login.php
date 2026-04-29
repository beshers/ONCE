<?php
require_once __DIR__ . '/config.php';

// Handle any server-side logic here if needed (e.g. redirect if already logged in)
if (isLoggedIn() && basename($_SERVER['PHP_SELF']) === 'login.php') {
    header('Location: dashboard.php');
    exit;
}

$csrf = csrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - WEB IDE CODE EDITOR</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        html, body { height: 100%; margin: 0; padding: 0; }

        .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            /* FIX: allow scroll so buttons are never clipped on small screens */
            overflow-y: auto;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            padding: 30px 20px;
            box-sizing: border-box;
        }

        .auth-box {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            box-sizing: border-box;
        }

        .auth-logo {
            text-align: center;
            margin-bottom: 28px;
        }
        .auth-logo i {
            font-size: 2.8rem;
            background: linear-gradient(135deg, #00d4ff, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-logo h1 {
            font-size: 1.4rem;
            margin: 10px 0 4px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: 800;
            background: linear-gradient(90deg, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-logo p {
            font-size: 0.75rem;
            color: #64748b;
            margin: 0;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .auth-tabs {
            display: flex;
            margin-bottom: 26px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .auth-tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            color: #94a3b8;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
            font-size: 0.9rem;
            user-select: none;
        }
        .auth-tab.active { color: #00d4ff; border-bottom-color: #00d4ff; font-weight: 600; }
        .auth-tab:hover:not(.active) { color: #cbd5e1; }

        /* Only CSS controls form visibility — no inline style conflicts */
        .auth-form { display: none; }
        .auth-form.active { display: block; }

        .form-group { margin-bottom: 16px; }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: #94a3b8;
            font-size: 0.83rem;
            font-weight: 500;
        }
        .form-group .input-icon { position: relative; }
        .form-group .input-icon i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            font-size: 0.85rem;
            pointer-events: none;
        }
        .form-group .input-icon input {
            width: 100%;
            padding: 13px 14px 13px 42px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            color: #fff;
            font-size: 0.92rem;
            transition: all 0.3s;
            box-sizing: border-box;
        }
        .form-group .input-icon input:focus {
            outline: none;
            border-color: #00d4ff;
            background: rgba(0, 212, 255, 0.05);
            box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
        }
        .form-group .input-icon input::placeholder { color: #475569; }

        .form-extras {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .remember-me { display: flex; align-items: center; gap: 8px; }
        .remember-me input[type="checkbox"] { width: 16px; height: 16px; accent-color: #00d4ff; cursor: pointer; }
        .remember-me label { color: #94a3b8; font-size: 0.83rem; cursor: pointer; }
        .forgot-password a { color: #00d4ff; text-decoration: none; font-size: 0.83rem; }
        .forgot-password a:hover { text-decoration: underline; }

        /* THE FIX: btn-auth is always a full block — never hidden or cut off */
        .btn-auth {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #00d4ff, #7c3aed);
            border: none;
            border-radius: 10px;
            color: #fff;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            letter-spacing: 0.5px;
            min-height: 50px;
            box-sizing: border-box;
            margin-top: 4px;
        }
        .btn-auth:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0, 212, 255, 0.35); }
        .btn-auth:active { transform: translateY(0); }
        .btn-auth:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-auth .spinner {
            display: none;
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-divider {
            text-align: center;
            margin: 22px 0;
            color: #64748b;
            font-size: 0.8rem;
            position: relative;
        }
        .auth-divider::before, .auth-divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 36%;
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
        }
        .auth-divider::before { left: 0; }
        .auth-divider::after  { right: 0; }

        .social-login { display: flex; gap: 12px; }
        .btn-social {
            flex: 1;
            padding: 11px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #94a3b8;
            font-size: 1.15rem;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-social:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }

        .alert {
            padding: 13px 16px;
            border-radius: 10px;
            margin-bottom: 18px;
            display: none;
            font-size: 0.88rem;
            line-height: 1.4;
        }
        .alert.error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.4);  color: #fca5a5; }
        .alert.success { background: rgba(34,197,94,0.15);  border: 1px solid rgba(34,197,94,0.4);  color: #86efac; }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">

            <div class="auth-logo">
                <i class="fas fa-code"></i>
                <h1>Web IDE Code Editor</h1>
                <p>Your cloud development environment</p>
            </div>

            <div class="alert" id="alertMessage"></div>

            <div class="auth-tabs">
                <div class="auth-tab active" data-tab="login">
                    <i class="fas fa-sign-in-alt"></i> Login
                </div>
                <div class="auth-tab" data-tab="register">
                    <i class="fas fa-user-plus"></i> Register
                </div>
            </div>

            <!-- LOGIN FORM -->
            <form class="auth-form active" id="loginForm" method="POST" autocomplete="off">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf); ?>">
                <input type="hidden" name="action" value="login">

                <div class="form-group">
                    <label>Email or Username</label>
                    <div class="input-icon">
                        <i class="fas fa-user"></i>
                        <input type="text" name="email" required placeholder="Enter your email or username" autocomplete="username">
                    </div>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <div class="input-icon">
                        <i class="fas fa-lock"></i>
                        <input type="password" name="password" required placeholder="Enter your password" autocomplete="current-password">
                    </div>
                </div>

                <div class="form-extras">
                    <div class="remember-me">
                        <input type="checkbox" id="remember" name="remember">
                        <label for="remember">Remember me</label>
                    </div>
                    <div class="forgot-password"><a href="#">Forgot password?</a></div>
                </div>

                <button type="submit" class="btn-auth" id="loginBtn">
                    <span class="spinner" id="loginSpinner"></span>
                    <i class="fas fa-sign-in-alt" id="loginIcon"></i>
                    <span>Login</span>
                </button>
            </form>

            <!-- REGISTER FORM -->
            <form class="auth-form" id="registerForm" method="POST" autocomplete="off">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf); ?>">
                <input type="hidden" name="action" value="register">

                <div class="form-group">
                    <label>Username</label>
                    <div class="input-icon">
                        <i class="fas fa-at"></i>
                        <input type="text" name="username" required placeholder="Choose a username" minlength="3" autocomplete="off">
                    </div>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <div class="input-icon">
                        <i class="fas fa-envelope"></i>
                        <input type="email" name="email" required placeholder="Enter your email" autocomplete="off">
                    </div>
                </div>

                <div class="form-group">
                    <label>Full Name <span style="color:#475569;font-size:0.76rem;">(optional)</span></label>
                    <div class="input-icon">
                        <i class="fas fa-id-card"></i>
                        <input type="text" name="full_name" placeholder="Your full name" autocomplete="off">
                    </div>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <div class="input-icon">
                        <i class="fas fa-lock"></i>
                        <input type="password" name="password" required placeholder="Create a password (min 6 chars)" minlength="6" autocomplete="new-password">
                    </div>
                </div>

                <div class="form-group">
                    <label>Confirm Password</label>
                    <div class="input-icon">
                        <i class="fas fa-lock"></i>
                        <input type="password" name="confirm_password" required placeholder="Repeat your password" autocomplete="new-password">
                    </div>
                </div>

                <button type="submit" class="btn-auth" id="registerBtn">
                    <span class="spinner" id="registerSpinner"></span>
                    <i class="fas fa-rocket" id="registerIcon"></i>
                    <span>Create Account</span>
                </button>
            </form>

            <div class="auth-divider">or continue with</div>

            <div class="social-login">
                <button type="button" class="btn-social" title="GitHub"><i class="fab fa-github"></i></button>
                <button type="button" class="btn-social" title="Google"><i class="fab fa-google"></i></button>
                <button type="button" class="btn-social" title="Microsoft"><i class="fab fa-microsoft"></i></button>
            </div>

        </div>
    </div>

    <script>
    // ── TAB SWITCHING (completely rewritten — no more inline display conflicts) ──
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 1. Deactivate all tabs
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            // 2. Hide all forms by removing 'active' class (CSS handles display:none)
            //    Also clear any rogue inline styles from previous JS runs
            document.querySelectorAll('.auth-form').forEach(f => {
                f.classList.remove('active');
                f.style.removeProperty('display');
            });
            // 3. Activate chosen tab and form
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
            hideAlert();
        });
    });

    // ── LOGIN ──
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('login', true);
        try {
            const res  = await fetch('auth.php?action=login', { method: 'POST', body: new FormData(e.target) });
            const data = await res.json();
            if (data.success) {
                showAlert(data.message || 'Login successful!', 'success');
                setTimeout(() => window.location.href = 'dashboard.php', 1200);
            } else {
                showAlert(data.message || 'Invalid credentials.', 'error');
                setLoading('login', false);
            }
        } catch {
            showAlert('Connection error. Please try again.', 'error');
            setLoading('login', false);
        }
    });

    // ── REGISTER ──
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (fd.get('password') !== fd.get('confirm_password')) {
            showAlert('Passwords do not match!', 'error');
            return;
        }
        setLoading('register', true);
        try {
            const res  = await fetch('auth.php?action=register', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                showAlert(data.message || 'Account created successfully!', 'success');
                setTimeout(() => window.location.href = 'dashboard.php', 1200);
            } else {
                showAlert(data.message || 'Registration failed.', 'error');
                setLoading('register', false);
            }
        } catch {
            showAlert('Connection error. Please try again.', 'error');
            setLoading('register', false);
        }
    });

    function showAlert(msg, type) {
        const el = document.getElementById('alertMessage');
        el.textContent = msg;
        el.className = 'alert ' + type;
        el.style.display = 'block';
        clearTimeout(el._t);
        el._t = setTimeout(hideAlert, 5000);
    }
    function hideAlert() {
        const el = document.getElementById('alertMessage');
        el.style.display = 'none';
    }
    function setLoading(form, on) {
        document.getElementById(form + 'Btn').disabled         = on;
        document.getElementById(form + 'Spinner').style.display = on ? 'block' : 'none';
        document.getElementById(form + 'Icon').style.display    = on ? 'none'  : '';
    }

    if (new URLSearchParams(window.location.search).get('logged_out') === '1') {
        showAlert('You have been logged out successfully.', 'success');
    }
    </script>
</body>
</html>
