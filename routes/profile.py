from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import supabase
import os

profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/profile', methods=['POST'])
def upsert_profile():
    """Membuat atau memperbarui profil user dengan data yang lengkap."""
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"status": "error", "message": "User ID is required."}), 400
        
    # Kumpulkan data dari request (bisa kosong jika user belum mau mengisi semuanya)
    upsert_data = {
        "user_id": user_id,
        "username": data.get('username'),
        "full_name": data.get('full_name'),
        "avatar_url": data.get('avatar_url'),
        "bio": data.get('bio'),
        "favorite_team_id": data.get('favorite_team_id'),
        "favorite_team_name": data.get('favorite_team_name')
    }
    
    # Hapus key yang nilainya None agar Supabase tidak menimpa data lama dengan Null secara tidak sengaja
    upsert_data = {k: v for k, v in upsert_data.items() if v is not None}
    
    try:
        response = supabase.table('profiles').upsert(upsert_data).execute()
        print(f"[Success] Profile updated successfully for user_id: {user_id}")
        return jsonify({
            "status": "success", 
            "message": "Profile has been successfully updated.", 
            "data": response.data
        }), 200
    except Exception as e:
        print(f"[Error] Failed to update profile: {str(e)}")
        # Handle error spesifik jika username sudah dipakai orang lain
        if "duplicate key value violates unique constraint" in str(e).lower():
            return jsonify({"status": "error", "message": "Username is already taken."}), 409
            
        return jsonify({"status": "error", "message": "An internal server error occurred while updating the profile."}), 500

@profile_bp.route('/profile', methods=['GET'])
def get_profile():
    """Mengambil data profil berdasarkan user_id."""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"status": "error", "message": "User ID parameter is required."}), 400
        
    try:
        response = supabase.table('profiles').select('*').eq('user_id', user_id).execute()
        
        if not response.data:
            return jsonify({"status": "success", "message": "Profile not found.", "data": None}), 200
            
        return jsonify({"status": "success", "data": response.data[0]}), 200
    except Exception as e:
        print(f"[Error] Failed to retrieve profile: {str(e)}")
        return jsonify({"status": "error", "message": "An internal server error occurred while retrieving the profile."}), 500

@profile_bp.route('/profile/avatar', methods=['POST'])
def upload_avatar():
    """Mengunggah file gambar ke Supabase Storage dan mengembalikan URL publiknya."""
    if 'file' not in request.files:
        print("[Error] No file part found in the incoming request.")
        return jsonify({"status": "error", "message": "No file uploaded."}), 400
        
    file = request.files['file']
    user_id = request.form.get('user_id')
    
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file."}), 400
        
    if not user_id:
        return jsonify({"status": "error", "message": "User ID parameter is required."}), 400

    try:
        # Amankan nama file dan tentukan lokasi simpan (format: user_id/namafile.ext)
        # Dengan format user_id/ di depan, setiap user akan punya folder fotonya masing-masing
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'jpg'
        storage_path = f"{user_id}/avatar_{user_id}.{file_ext}"
        
        # Membaca isi file menjadi bytes
        file_bytes = file.read()
        
        # Upload ke Supabase Storage bucket 'avatars'
        # Gunakan parameter upsert=True agar foto lama tertimpa dengan foto baru
        res = supabase.storage.from_('avatars').upload(
            file=file_bytes,
            path=storage_path,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        # Ambil URL publik dari file yang baru saja di-upload
        public_url = supabase.storage.from_('avatars').get_public_url(storage_path)
        
        # Opsional: Langsung update avatar_url di tabel profiles
        supabase.table('profiles').update({"avatar_url": public_url}).eq('user_id', user_id).execute()
        
        print(f"[Success] Avatar uploaded and profile updated for user: {user_id}")
        return jsonify({
            "status": "success",
            "message": "Avatar uploaded successfully.",
            "avatar_url": public_url
        }), 200
        
    except Exception as e:
        print(f"[Error] Failed to process avatar upload: {str(e)}")
        return jsonify({"status": "error", "message": "An internal server error occurred while uploading the avatar."}), 500