CREATE DATABASE IF NOT EXISTS changepassword CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE changepassword;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    current_password VARCHAR(255) NOT NULL,
    registration_date DATETIME,
    password_changes_count INT DEFAULT 0
);

CREATE TABLE validation_rules (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    description TEXT NOT NULL,
    active BOOLEAN
);

CREATE TABLE password_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    old_password VARCHAR(255) NOT NULL,
    new_password VARCHAR(255) NOT NULL,
    validation_rule_id INT,
    change_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (validation_rule_id) REFERENCES validation_rules(rule_id) ON DELETE SET NULL
);

CREATE TABLE wall_posts (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    post_date DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
);

DELIMITER //

CREATE TRIGGER after_password_insert
AFTER INSERT ON password_history
FOR EACH ROW
BEGIN
    UPDATE users
    SET password_changes_count = password_changes_count + 1
    WHERE user_id = NEW.user_id;
END;
//

DELIMITER ;

DELIMITER //

CREATE TRIGGER after_password_delete
AFTER DELETE ON password_history
FOR EACH ROW
BEGIN
    UPDATE users
    SET password_changes_count = GREATEST(password_changes_count - 1, 0)
    WHERE user_id = OLD.user_id;
END;
//

DELIMITER ;
