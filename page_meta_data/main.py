import json
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

# Helper function to convert Decimal to int or float
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert to int if it's a whole number, otherwise float
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    # Parse query parameters from the raw request
    try:
        query_params = event.get('queryStringParameters', {})
        site_id = query_params.get('site_id')
        page_name = query_params.get('page_name')
    except AttributeError:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': "Invalid request format. Ensure query parameters are sent."
            })
        }

    if not site_id or not page_name:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': "Both 'site_id' and 'page_name' are required query parameters."
            })
        }

    # Reference the DynamoDB table
    table_name = "ccs_site_meta_data"
    table = dynamodb.Table(table_name)

    try:
        # Attempt to retrieve the item
        response = table.get_item(Key={'site_id': site_id})
        item = response.get('Item')

        if not item:
            # Create a new item if it doesn't exist
            item = {
                'site_id': site_id,
                'page_visits': {}
            }

        # Update the page_visits count
        page_visits = item.get('page_visits', {})
        page_visits[page_name] = page_visits.get(page_name, 0) + 1
        item['page_visits'] = page_visits

        # Write the updated item back to the table
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Page visit count updated successfully.',
                'site_id': site_id,
                'page_visits': item['page_visits']
            }, cls=DecimalEncoder)  # Use the custom encoder here
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'An error occurred while accessing DynamoDB.',
                'error': str(e)
            })
        }
