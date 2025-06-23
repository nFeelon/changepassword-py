import mysql.connector
import os
import datetime
import bcrypt

# Параметры подключения к MySQL
DATABASE_CONFIG = {
    'host': 'MySQL-8.2',
    'user': 'root',
    'password': '',
    'database': 'changepassword',
    'charset': 'utf8mb4'
}

def create_database():
    try:
        connection = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = connection.cursor()
        
        # Таблица пользователей
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL,
            current_password VARCHAR(255) NOT NULL,
            registration_date DATETIME,
            password_changes_count INT DEFAULT 0
        )
        ''')
        
        # Таблица правил валидации
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS validation_rules (
            rule_id INT PRIMARY KEY AUTO_INCREMENT,
            description TEXT NOT NULL,
            active BOOLEAN
        )
        ''')
        
        # Таблица истории паролей
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS password_history (
            history_id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            old_password VARCHAR(255) NOT NULL,
            new_password VARCHAR(255) NOT NULL,
            validation_rule_id INT,
            change_date DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (validation_rule_id) REFERENCES validation_rules(rule_id) ON DELETE SET NULL
        )
        ''')
        
        # Таблица постов на стене
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS wall_posts (
            post_id INT PRIMARY KEY AUTO_INCREMENT,
            author_id INT NOT NULL,
            content TEXT NOT NULL,
            post_date DATETIME,
            FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
        ''')
        
        # Создание триггеров для MySQL
        # Триггер после добавления пароля
        cursor.execute('''
        DROP TRIGGER IF EXISTS after_password_insert
        ''')
        
        cursor.execute('''
        CREATE TRIGGER after_password_insert
        AFTER INSERT ON password_history
        FOR EACH ROW
        BEGIN
            UPDATE users
            SET password_changes_count = password_changes_count + 1
            WHERE user_id = NEW.user_id;
        END
        ''')
        
        # Триггер после удаления пароля
        cursor.execute('''
        DROP TRIGGER IF EXISTS after_password_delete
        ''')
        
        cursor.execute('''
        CREATE TRIGGER after_password_delete
        AFTER DELETE ON password_history
        FOR EACH ROW
        BEGIN
            UPDATE users
            SET password_changes_count = GREATEST(password_changes_count - 1, 0)
            WHERE user_id = OLD.user_id;
        END
        ''')
        
        connection.commit()
        print("Таблицы успешно созданы")

        add_validation_rules(cursor, connection)

        add_test_user(cursor, connection)
        
        print("Инициализация базы данных завершена успешно")
        
    except Exception as e:
        print(f"Ошибка при работе с MySQL: {e}")
    finally:
        if connection:
            cursor.close()
            connection.close()
            print("Соединение с MySQL закрыто")

def add_validation_rules(cursor, connection):
    cursor.execute("SELECT COUNT(*) FROM validation_rules")
    count = cursor.fetchone()[0]
    
    if count == 0:
        rules = [
            "Не менее 8 цифр",
            "Сумма цифр равна 35",
            "Включает текущий год",
            "Включает европейскую столицу",
            "Имя рекордсмена в беге на 100м"
        ]
        
        for rule in rules:
            cursor.execute(
                "INSERT INTO validation_rules (description, active) VALUES (%s, %s)",
                (rule, True)
            )
        
        connection.commit()
        print("Правила валидации добавлены")

def add_test_user(cursor, connection):
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    if count == 0:
        username = "admin"
        password = "admin123"
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute(
            "INSERT INTO users (username, current_password, registration_date) VALUES (%s, %s, %s)",
            (username, hashed_password, datetime.datetime.now().isoformat())
        )
        
        user_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO password_history (user_id, old_password, new_password, change_date) VALUES (%s, %s, %s, %s)",
            (user_id, '', hashed_password, datetime.datetime.now().isoformat())
        )
        
        connection.commit()
        print(f"Тестовый пользователь '{username}' с паролем '{password}' добавлен")

if __name__ == "__main__":
    create_database()