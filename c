outes.py
@classes_bp.route('/', methods=['GET'])
@jwt_required()
def get_classes():