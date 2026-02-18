from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "super_secret_key"

DATABASE = "database.db"

# ------------------------
# Database Setup
# ------------------------

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    # Create default admin (if not exists)
    cursor.execute("SELECT * FROM admins WHERE username = ?", ("admin",))
    if not cursor.fetchone():
        hashed_password = generate_password_hash("admin123")
        cursor.execute(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            ("admin", hashed_password)
        )

    conn.commit()
    conn.close()

# ------------------------
# Routes
# ------------------------

@app.route('/')
def home():
    if 'admin_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admins WHERE username = ?", (username,))
        admin = cursor.fetchone()
        conn.close()

        if admin and check_password_hash(admin[2], password):
            session['admin_id'] = admin[0]
            session['username'] = admin[1]
            return redirect(url_for('dashboard'))
        else:
            return "Invalid Username or Password!"

    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'admin_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ------------------------
# Run App
# ------------------------

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
