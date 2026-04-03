import json
import os
import boto3
import uuid
from datetime import datetime

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

DOCUMENTS_TABLE = os.environ["DOCUMENTS_TABLE"]
AUDIT_TABLE = os.environ["AUDIT_TABLE"]
BUCKET_NAME = os.environ["BUCKET_NAME"]

documents_table = dynamodb.Table(DOCUMENTS_TABLE)
audit_table = dynamodb.Table(AUDIT_TABLE)

def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
        },
        "body": json.dumps(body)
    }

def get_user_context(event):
    claims = event["requestContext"]["authorizer"]["claims"]
    groups = claims.get("cognito:groups", [])
    if isinstance(groups, str):
        groups = [g.strip() for g in groups.split(",") if g.strip()]
    return {
        "user_id": claims.get("sub"),
        "email": claims.get("email", "unknown@example.com"),
        "groups": groups
    }

def log_audit(user_id, action, doc_id, status):
    """
    Logs to DynamoDB in the format:
    audit_id, action, document_id, status, timestamp, user_id
    """
    try:
        audit_table.put_item(
            Item={
                "audit_id": str(uuid.uuid4()),
                "action": action,
                "document_id": doc_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
        )
    except Exception as e:
        print(f"Audit Log Error: {str(e)}")

def lambda_handler(event, context):
    try:
        user = get_user_context(event)
        
        # Determine if this is a GET (List) or POST (Upload) request
        method = event.get("httpMethod")

        # --- CASE 1: LISTING DOCUMENTS ---
        if method == "GET":
            # Your existing logic to fetch items from documents_table...
            # Example response items = documents_table.scan() or query
            
            log_audit(user["user_id"], "LIST", "ALL", "SUCCESS")
            return response(200, {"message": "List successful"})

        # --- CASE 2: UPLOADING DOCUMENT ---
        elif method == "POST":
            body = json.loads(event.get("body", "{}"))
            document_type = body.get("document_type")
            filename = body.get("filename")

            if not document_type or not filename:
                return response(400, {"error": "Missing metadata"})

            document_id = str(uuid.uuid4())
            employee_id = user["user_id"]
            s3_key = f"documents/{employee_id}/{document_type}/{filename}"

            # Generate S3 Pre-signed URL
            upload_url = s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": s3_key,
                    "ContentType": "application/octet-stream"
                },
                ExpiresIn=900
            )

            # Save to Documents Table
            documents_table.put_item(
                Item={
                    "document_id": document_id,
                    "employee_id": employee_id,
                    "employee_email": user["email"],
                    "document_type": document_type,
                    "filename": filename,
                    "s3_key": s3_key,
                    "upload_timestamp": datetime.utcnow().isoformat(),
                    "is_deleted": False
                }
            )

            # Log to Audit Table matching your screenshot format
            log_audit(user["user_id"], "UPLOAD", document_id, "SUCCESS")

            return response(200, {
                "upload_url": upload_url, 
                "document_id": document_id
            })

    except Exception as e:
        print(f"System Error: {str(e)}")
        # Log failure if user context is available
        if 'user' in locals():
            log_audit(user["user_id"], "ACTION_FAILED", "N/A", "ERROR")
        return response(500, {"error": str(e)})