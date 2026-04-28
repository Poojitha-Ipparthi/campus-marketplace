import uuid
from firebase_admin import storage


def upload_image_to_firebase(file, folder="listings"):
    bucket = storage.bucket()

    # Generate unique filename
    ext = file.name.split(".")[-1]
    filename = f"{folder}/{uuid.uuid4()}.{ext}"

    blob = bucket.blob(filename)
    blob.upload_from_file(file, content_type=file.content_type)

    # Make the file publicly accessible
    blob.make_public()

    return blob.public_url
