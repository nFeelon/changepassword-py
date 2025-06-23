from flask import Flask, request, jsonify, session, redirect, url_for
import mysql.connector
import bcrypt
import re
import datetime
import os
from functools import wraps
from config.validation_rules import validation_rules

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.urandom(24)

def sync_validation_rules_to_db():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        rules = validation_rules.rules
        cursor.execute("UPDATE validation_rules SET active = %s", (False,))

        for rule in rules:
            if rule.get('active', False):
                description = rule.get('name')
                cursor.execute("SELECT rule_id FROM validation_rules WHERE description = %s", (description,))
                existing_rule = cursor.fetchone()
                
                if existing_rule:
                    cursor.execute("UPDATE validation_rules SET active = %s WHERE rule_id = %s", 
                                  (True, existing_rule[0]))
                else:
                    cursor.execute("INSERT INTO validation_rules (description, active) VALUES (%s, %s)",
                                  (description, True))
        
        connection.commit()
        print("Правила валидации успешно синхронизированы с базой данных")
    except Exception as e:
        print(f"Ошибка при синхронизации правил валидации: {e}")
    finally:
        if connection:
            cursor.close()
            connection.close()

# Параметры подключения к MySQL
DATABASE_CONFIG = {
    'host': 'MySQL-8.2',
    'user': 'root',
    'password': '',
    'database': 'changepassword',
    'charset': 'utf8mb4'
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DATABASE_CONFIG)
        return connection
    except Exception as e:
        print(f"Ошибка при подключении к MySQL: {e}")
    return None

def validate_username(username):
    if not username or username.strip() == '':
        return {
            'valid': False,
            'message': 'Имя пользователя не может быть пустым'
        }
    
    if ' ' in username:
        return {
            'valid': False,
            'message': 'Имя пользователя не должно содержать пробелы'
        }
    
    if len(username) > 20:
        return {
            'valid': False,
            'message': 'Имя пользователя не должно превышать 20 символов'
        }

    if not re.match(r'^[a-zA-Z0-9а-яА-ЯёЁ]+$', username):
        return {
            'valid': False,
            'message': 'Имя пользователя должно содержать только буквы и цифры'
        }
    
    return {
        'valid': True,
        'message': ''
    }

# Декоратор для проверки авторизации
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Маршруты для статических HTML-страниц
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/login')
def login_page():
    return app.send_static_file('login.html')

@app.route('/register')
def register_page():
    return app.send_static_file('register.html')

@app.route('/change_password')
def change_password_page():
    return app.send_static_file('change_password.html')

@app.route('/profile')
@login_required
def profile_page():
    return app.send_static_file('profile.html')

@app.route('/404')
def page_not_found_page():
    return app.send_static_file('404.html')

# API для авторизации
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    remember = data.get('remember', False)
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Необходимо указать имя пользователя и пароль'}), 400
    
    username_validation = validate_username(username)
    if not username_validation['valid']:
        return jsonify({'success': False, 'message': username_validation['message']}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Пользователь не найден'}), 404
        
        if bcrypt.checkpw(password.encode('utf-8'), user['current_password'].encode('utf-8')):
            session['user_id'] = user['user_id']
            session['username'] = user['username']
            
            if remember:
                session.permanent = True
            
            cursor.execute("""
                SELECT change_date FROM password_history 
                WHERE user_id = %s 
                ORDER BY change_date DESC LIMIT 1
            """, (user['user_id'],))
            
            last_change = cursor.fetchone()
            last_change_date = last_change['change_date'] if last_change else None
            
            return jsonify({
                'success': True, 
                'message': 'Авторизация успешна',
                'passwordChanges': user['password_changes_count'],
                'lastChangeDate': last_change_date,
                'registrationDate': user['registration_date']
            })
        else:
            return jsonify({'success': False, 'message': 'Неверный пароль'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

# API для регистрации
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    
    if not username or not password or not confirm_password:
        return jsonify({'success': False, 'message': 'Все поля должны быть заполнены'}), 400
    
    username_validation = validate_username(username)
    if not username_validation['valid']:
        return jsonify({'success': False, 'message': username_validation['message']}), 400
    
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Пароли не совпадают'}), 400

    validation_result = validate_password(password)
    if not validation_result['valid']:
        return jsonify({'success': False, 'message': validation_result['message']}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Пользователь с таким именем уже существует'}), 409
        
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute("INSERT INTO users (username, current_password, registration_date) VALUES (%s, %s, %s)", (username, hashed_password, datetime.datetime.now().isoformat()))
        user_id = cursor.lastrowid
        
        cursor.execute("INSERT INTO password_history (user_id, old_password, new_password, validation_rule_id, change_date) VALUES (%s, %s, %s, %s, %s)", (user_id, '', hashed_password, None, datetime.datetime.now().isoformat()))
        
        conn.commit()
        
        session['user_id'] = user_id
        session['username'] = username
        
        return jsonify({'success': True, 'message': 'Регистрация успешна'})
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/change_password', methods=['POST'])
def change_password():
    data = request.get_json()
    username = data.get('username')
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not username or not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Все поля должны быть заполнены'}), 400
    
    validation_result = validate_password(new_password)
    if not validation_result['valid']:
        return jsonify({'success': False, 'message': validation_result['message']}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Пользователь не найден'}), 404

        if not bcrypt.checkpw(old_password.encode('utf-8'), user['current_password'].encode('utf-8')):
            return jsonify({'success': False, 'message': 'Неверный текущий пароль'}), 401

        if bcrypt.checkpw(new_password.encode('utf-8'), user['current_password'].encode('utf-8')):
            return jsonify({'success': False, 'message': 'Новый пароль должен отличаться от текущего'}), 400

        hashed_new_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        cursor.execute("UPDATE users SET current_password = %s WHERE user_id = %s", (hashed_new_password, user['user_id']))
        cursor.execute("INSERT INTO password_history (user_id, old_password, new_password, change_date) VALUES (%s, %s, %s, %s)", (user['user_id'], user['current_password'], hashed_new_password, datetime.datetime.now().isoformat()))
        
        conn.commit()

        cursor.execute("SELECT password_changes_count FROM users WHERE user_id = %s", (user['user_id'],))
        updated_user = cursor.fetchone()
        
        return jsonify({
            'success': True, 
            'message': 'Пароль успешно изменен',
            'passwordChanges': updated_user['password_changes_count'],
            'lastChangeDate': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Выход выполнен успешно'})

def validate_password(password):
    results = validation_rules.validate_password(password)
    
    for result in results:
        if not result['valid']:
            return {
                'valid': False,
                'message': f'Пароль не соответствует требованию: {result["name"]}',
                'rule_id': result['id']
            }
    
    return {'valid': True, 'message': 'Пароль соответствует всем требованиям'}

@app.route('/api/similar_password_users', methods=['POST'])
def get_similar_password_users():
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({'success': False, 'message': 'Пароль не указан'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT user_id, username, current_password FROM users")
        users = cursor.fetchall()
        
        similar_users = []
        for user in users:
            if bcrypt.checkpw(password.encode('utf-8'), user['current_password'].encode('utf-8')):
                similar_users.append(user['username'])
        
        return jsonify({'success': True, 'users': similar_users})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/check_password', methods=['POST'])
def check_password():
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({'valid': False, 'message': 'Пароль не может быть пустым'})

    result = validate_password(password)
    return jsonify(result)

@app.route('/api/validation_rules', methods=['GET'])
def get_validation_rules():
    active_rules = validation_rules.get_active_rules()
    return jsonify({'success': True, 'rules': active_rules})

@app.route('/api/user/<username>', methods=['GET'])
def get_user_data(username):
    if not username:
        return jsonify({'success': False, 'message': 'Имя пользователя не указано'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id, username, registration_date, password_changes_count,
                   (SELECT change_date FROM password_history 
                    WHERE user_id = users.user_id 
                    ORDER BY change_date DESC LIMIT 1) as last_change_date
            FROM users 
            WHERE username = %s
        """, (username,))
        
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Пользователь не найден'}), 404

        user_data = {
            'username': user['username'],
            'registrationDate': user['registration_date'],
            'passwordChanges': user['password_changes_count'],
            'lastChangeDate': user['last_change_date']
        }
        
        return jsonify({'success': True, 'user': user_data})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/rating', methods=['GET'])
def get_password_changes_rating():
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        current_user_id = session.get('user_id')
        current_user_position = None
        
        cursor.execute("""
            SELECT username, password_changes_count, 
                   ROW_NUMBER() OVER (ORDER BY password_changes_count DESC) as position
            FROM users 
            ORDER BY password_changes_count DESC 
            LIMIT 10
        """)
        
        top_users = cursor.fetchall()
        
        if current_user_id:
            cursor.execute("""
                SELECT COUNT(*) + 1 as position
                FROM users 
                WHERE password_changes_count > (
                    SELECT password_changes_count 
                    FROM users 
                    WHERE user_id = %s
                )
            """, (current_user_id,))
            
            position_result = cursor.fetchone()
            if position_result:
                current_user_position = position_result['position']
            
            cursor.execute("""
                SELECT username, password_changes_count
                FROM users 
                WHERE user_id = %s
            """, (current_user_id,))
            
            current_user = cursor.fetchone()
        
        rating_data = {
            'top_users': [{
                'username': user['username'],
                'password_changes': user['password_changes_count'],
                'position': user['position']
            } for user in top_users],
            'current_user': None
        }
        
        if current_user_id and current_user_position and 'current_user' in locals():
            rating_data['current_user'] = {
                'username': current_user['username'],
                'password_changes': current_user['password_changes_count'],
                'position': current_user_position
            }
        
        return jsonify({'success': True, 'rating': rating_data})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/user_id/<string:username>', methods=['GET'])
def get_user_id(username):
    if not username:
        return jsonify({'success': False, 'message': 'Необходимо указать имя пользователя'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'Пользователь не найден'}), 404
        
        return jsonify({
            'success': True, 
            'user_id': user['user_id']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка при получении ID пользователя: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/wall_posts/<int:user_id>', methods=['GET'])
def get_wall_posts(user_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Необходимо авторизоваться'}), 401
    
    if session['user_id'] != user_id:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    sort_by = request.args.get('sort', 'new-first')
    search_query = request.args.get('search', '')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT post_id, content, post_date 
            FROM wall_posts 
            WHERE author_id = %s
        """
        
        params = [user_id]

        if search_query:
            sql += " AND content LIKE %s"
            params.append(f'%{search_query}%')

        if sort_by == 'old-first':
            sql += " ORDER BY post_date ASC"
        elif sort_by == 'short-first':
            sql += " ORDER BY LENGTH(content) ASC"
        elif sort_by == 'long-first':
            sql += " ORDER BY LENGTH(content) DESC"
        else:
            sql += " ORDER BY post_date DESC"
        
        cursor.execute(sql, tuple(params))
        
        posts = []
        for row in cursor.fetchall():
            posts.append({
                'post_id': row['post_id'],
                'content': row['content'],
                'post_date': row['post_date']
            })
        
        return jsonify({
            'success': True, 
            'posts': posts
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка при получении сообщений: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/wall_posts', methods=['POST'])
def add_wall_post():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Необходимо авторизоваться'}), 401
    
    data = request.get_json()
    content = data.get('content')
    
    if not content or len(content.strip()) == 0:
        return jsonify({'success': False, 'message': 'Сообщение не может быть пустым'}), 400
    
    if len(content) > 500:
        return jsonify({'success': False, 'message': 'Сообщение слишком длинное (максимум 500 символов)'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        now = datetime.datetime.now()
        now_iso = now.isoformat()
        
        cursor.execute("INSERT INTO wall_posts (author_id, content, post_date) VALUES (%s, %s, %s)", (session['user_id'], content, now_iso))
        
        post_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Сообщение успешно добавлено',
            'post': {
                'post_id': post_id,
                'content': content,
                'post_date': now_iso
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка при добавлении сообщения: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/wall_posts/<int:post_id>', methods=['DELETE'])
def delete_wall_post(post_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Необходимо авторизоваться'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Ошибка подключения к базе данных'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT author_id FROM wall_posts WHERE post_id = %s", (post_id,))
        post = cursor.fetchone()
        
        if not post:
            return jsonify({'success': False, 'message': 'Сообщение не найдено'}), 404
        
        if post['author_id'] != session['user_id']:
            return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
        
        cursor.execute("DELETE FROM wall_posts WHERE post_id = %s", (post_id,))
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Сообщение успешно удалено'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Ошибка при удалении сообщения: {str(e)}'}), 500
    finally:
        conn.close()

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

# Перехват всех неизвестных маршрутов
@app.route('/<path:path>')
def catch_all(path):
    return app.send_static_file('404.html'), 404

if __name__ == '__main__':
    sync_validation_rules_to_db()
    app.run(debug=True)