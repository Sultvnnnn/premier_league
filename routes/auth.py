from flask import Blueprint, jsonify, request
from config import supabase

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500

    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required."}), 400
    
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        return jsonify({
            "status": "success",
            "message": "Registration Success!",
            "data": {
                "user": response.user.id,
                "email": response.user.email
            }
        }), 201
    except Exception as e:
        print(f"[Error] Failed to register: {str(e)}")
        return jsonify({"status": "error", "message": "Registration failed. Ensure the email is not registered and the password is at least 6 characters long."}), 400
    
@auth_bp.route('/login', methods=['POST'])
def login():
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500
        
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required."}), 400
        
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        return jsonify({
            "status": "success", 
            "message": "Login Success!", 
            "data": {
                "user_id": response.user.id,
                "email": response.user.email,
                "access_token": response.session.access_token
            }
        }), 200
        
    except Exception as e:
        print(f"[Error] Failed to login: {str(e)}")
        return jsonify({"status": "error", "message": "Invalid email or password."}), 401
