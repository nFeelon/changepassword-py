import json
import os
import datetime

class ValidationRules:
    def __init__(self):
        self.rules = []
        self.load_rules()
    
    def load_rules(self):
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'validation_rules.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                self.rules = config.get('rules', [])
                
                for rule in self.rules:
                    if rule.get('type') == 2 and rule.get('value') == 'current_year':
                        rule['value'] = str(datetime.datetime.now().year)
        except Exception as e:
            print(f"Ошибка при загрузке правил валидации: {e}")
            self.rules = [
                {
                    "id": 1,
                    "name": "Не менее 8 цифр",
                    "type": 0,
                    "value": 8,
                    "active": True
                },
                {
                    "id": 2,
                    "name": "Сумма цифр равна 35",
                    "type": 1,
                    "value": 35,
                    "active": True
                },
                {
                    "id": 3,
                    "name": "Включает текущий год",
                    "type": 2,
                    "value": str(datetime.datetime.now().year),
                    "active": True
                },
                {
                    "id": 4,
                    "name": "Включает европейскую столицу",
                    "type": 3,
                    "value": ["париж", "лондон", "берлин", "мадрид", "рим", "вена", "прага", "афины", "варшава", "москва"],
                    "active": True
                },
                {
                    "id": 5,
                    "name": "Имя рекордсмена в беге на 100м",
                    "type": 3,
                    "value": ["усэйн болт", "болт", "усэйн"],
                    "active": True
                }
            ]
    
    def get_active_rules(self):
        return [rule for rule in self.rules if rule.get('active', False)]
    
    def get_rule_by_id(self, rule_id):
        for rule in self.rules:
            if rule.get('id') == rule_id:
                return rule
        return None
    
    def validate_password(self, password):
        active_rules = self.get_active_rules()
        results = []
        
        for rule in active_rules:
            rule_type = rule.get('type')
            rule_value = rule.get('value')
            rule_name = rule.get('name')
            
            if rule_type == 0:  # Проверка на количество цифр
                digit_count = sum(1 for char in password if char.isdigit())
                is_valid = digit_count >= rule_value
                results.append({
                    'id': rule.get('id'),
                    'name': rule_name,
                    'valid': is_valid
                })
            
            elif rule_type == 1:  # Проверка на сумму цифр
                digit_sum = sum(int(char) for char in password if char.isdigit())
                is_valid = digit_sum == rule_value
                results.append({
                    'id': rule.get('id'),
                    'name': rule_name,
                    'valid': is_valid
                })
            
            elif rule_type == 2:  # Проверка на включение текущего года
                is_valid = rule_value in password
                results.append({
                    'id': rule.get('id'),
                    'name': rule_name,
                    'valid': is_valid
                })
            
            elif rule_type == 3:  # Проверка на включение элемента из списка
                password_lower = password.lower()
                is_valid = any(item.lower() in password_lower for item in rule_value)
                results.append({
                    'id': rule.get('id'),
                    'name': rule_name,
                    'valid': is_valid
                })
                
            elif rule_type == 4:  # Проверка длины пароля
                password_length = len(password)
                is_valid = True
                
                # Проверка минимальной длины
                if isinstance(rule_value, dict) and 'min' in rule_value:
                    is_valid = is_valid and password_length >= rule_value['min']
                    
                # Проверка максимальной длины
                if isinstance(rule_value, dict) and 'max' in rule_value:
                    is_valid = is_valid and password_length <= rule_value['max']
                    
                results.append({
                    'id': rule.get('id'),
                    'name': rule_name,
                    'valid': is_valid
                })
        
        return results
    
    def to_json(self):
        return json.dumps({
            'rules': self.get_active_rules()
        })

validation_rules = ValidationRules()