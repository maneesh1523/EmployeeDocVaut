import json
import os
import boto3
from boto3.dynamodb.conditions import Key
import uuid
from datetime import datetime

dynamodb = boto3.resource("dynamodb")

DOCUMENTS_TABLE = os.environ["DOCUMENTS_TABLE"]
AUDIT_TABLE = os.environ["AUDIT_TABLE"]
MANAGER_TABLE = os.environ["MANAGER_TABLE"]

documents_table = dynamodb.Table(DOCUMENTS_TABLE)
audit_table = dynamodb.Table(AUDIT_TABLE)
manager_table = dynamodb.Table(MANAGER_TABLE)


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


def get_user(event):
    claims = event["requestContext"]["authorizer"]["claims"]
    return {
        "user_id": claims["sub"],
        "groups": [g for g in claims.get("cognito:groups", "").split(",") if g]
    }


def get_manager_team(manager_id):
    res = manager_table.get_item(Key={"manager_id": manager_id})
    return res.get("Item", {}).get("employee_ids", [])


def is_authorized(user, target_employee_id):
    if "HR_Admin" in user["groups"]:
        return True
    if "Employee" in user["groups"]:
        return user["user_id"] == target_employee_id
    if "Manager" in user["groups"]:
        return (
            user["user_id"] == target_employee_id or
            target_employee_id in get_manager_team(user["user_id"])
        )
    return False


def log_audit(user_id, action, doc_id, status):
    audit_table.put_item(
        Item={
            "audit_id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "document_id": doc_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


def lambda_handler(event, context):
    try:
        user = get_user(event)
        groups = user["groups"]

        items = []

        # 🔥 HR Admin → get ALL documents
        if "HR_Admin" in groups:
            res = documents_table.scan()
            items = res.get("Items", [])

        # 🔥 Manager → get team + self
        elif "Manager" in groups:
            team_ids = list(get_manager_team(user["user_id"]))
            team_ids.append(user["user_id"])

            for eid in team_ids:
                res = documents_table.query(
                    IndexName="employee_id-index",
                    KeyConditionExpression=Key("employee_id").eq(eid)
                )
                items.extend(res.get("Items", []))

        # 🔥 Employee → only self
        else:
            res = documents_table.query(
                IndexName="employee_id-index",
                KeyConditionExpression=Key("employee_id").eq(user["user_id"])
            )
            items = res.get("Items", [])

        # remove deleted
        items = [i for i in items if not i.get("is_deleted")]

        log_audit(user["user_id"], "LIST", "ALL", "SUCCESS")

        return response(200, items)

    except Exception as e:
        return response(500, {"error": str(e)})