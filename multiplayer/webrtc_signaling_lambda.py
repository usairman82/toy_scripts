import json
import os
import boto3
import logging
import traceback
from datetime import datetime

# Set up enhanced logging
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)  # Set to DEBUG for more detailed logging

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'tank-simulator-signaling-connections-prod'))
rooms_table = dynamodb.Table(os.environ.get('ROOMS_TABLE', 'tank-simulator-signaling-rooms-prod'))

# Initialize API Gateway Management API client
api_client = None

def init_api_client(event):
    """Initialize the API Gateway Management API client with the correct endpoint"""
    global api_client
    if api_client is None:
        try:
            domain = event['requestContext']['domainName']
            stage = event['requestContext']['stage']
            endpoint_url = f'https://{domain}/{stage}'
            logger.debug(f"Initializing API client with endpoint: {endpoint_url}")
            api_client = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
        except Exception as e:
            logger.error(f"Error initializing API client: {str(e)}")
            logger.error(f"Event structure: {json.dumps(event)}")
            raise

def lambda_handler(event, context):
    """Main Lambda handler function"""
    try:
        logger.debug(f"Received event: {json.dumps(event)}")
        
        # Initialize API client
        init_api_client(event)
        
        request_context = event.get('requestContext', {})
        event_type = request_context.get('eventType')
        connection_id = request_context.get('connectionId')
        
        logger.info(f"Processing {event_type} event for connection {connection_id}")
        
        # Handle WebSocket events
        if event_type == 'CONNECT':
            return handle_connect(event)
        elif event_type == 'DISCONNECT':
            return handle_disconnect(event)
        elif event_type == 'MESSAGE':
            return handle_message(event)
        else:
            logger.warning(f"Unhandled event type: {event_type}")
            return {'statusCode': 200, 'body': 'Unhandled event type'}
    
    except Exception as e:
        # Log the full exception traceback for debugging
        logger.error(f"Unhandled exception in lambda_handler: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def handle_connect(event):
    """Handle new WebSocket connection"""
    connection_id = event['requestContext']['connectionId']
    timestamp = datetime.now().isoformat()
    
    logger.info(f"New connection request: {connection_id}")
    logger.debug(f"Connect event details: {json.dumps(event)}")
    
    # Check for origin if needed for CORS
    headers = event.get('headers', {})
    origin = headers.get('Origin') or headers.get('origin')
    if origin:
        logger.info(f"Connection from origin: {origin}")
    
    try:
        # Store connection information
        connections_table.put_item(
            Item={
                'connection_id': connection_id,
                'timestamp': timestamp,
                'player_id': None,  # Will be set when they join a room
                'room': None,       # Will be set when they join a room
                'origin': origin
            }
        )
        
        logger.info(f"Connection established and stored: {connection_id}")
        return {'statusCode': 200, 'body': 'Connected'}
    
    except Exception as e:
        logger.error(f"Error storing connection {connection_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_disconnect(event):
    """Handle WebSocket disconnection"""
    connection_id = event['requestContext']['connectionId']
    
    logger.info(f"Handling disconnect for connection: {connection_id}")
    
    try:
        # Get player info before deleting
        response = connections_table.get_item(Key={'connection_id': connection_id})
        
        if 'Item' in response:
            player_data = response['Item']
            room_name = player_data.get('room')
            player_id = player_data.get('player_id')
            
            logger.debug(f"Found player data for disconnection: {json.dumps(player_data)}")
            
            # If player was in a room, handle their departure
            if room_name and player_id:
                handle_player_leave(room_name, player_id, connection_id)
        else:
            logger.warning(f"No player data found for disconnecting connection: {connection_id}")
        
        # Delete connection record
        connections_table.delete_item(Key={'connection_id': connection_id})
        
        logger.info(f"Disconnected and removed connection: {connection_id}")
        return {'statusCode': 200, 'body': 'Disconnected'}
    
    except Exception as e:
        logger.error(f"Error handling disconnect for {connection_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_message(event):
    """Handle incoming WebSocket message"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        logger.debug(f"Received message from {connection_id}: {event.get('body')}")
        
        message_body = json.loads(event['body'])
        message_type = message_body.get('type')
        
        logger.info(f"Processing message type: {message_type} from connection: {connection_id}")
        
        if message_type == 'join':
            return handle_join(connection_id, message_body)
        elif message_type == 'leave':
            return handle_leave(connection_id, message_body)
        elif message_type in ['offer', 'answer', 'ice_candidate']:
            return handle_signaling_message(connection_id, message_body)
        else:
            logger.warning(f"Unknown message type: {message_type} from {connection_id}")
            return {'statusCode': 400, 'body': 'Unknown message type'}
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON message from {connection_id}: {event.get('body')}")
        return {'statusCode': 400, 'body': 'Invalid JSON message'}
    
    except Exception as e:
        logger.error(f"Error handling message from {connection_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_join(connection_id, message):
    """Handle a player joining a game room with automatic room assignment"""
    player_id = message.get('playerId')
    
    logger.info(f"Player {player_id} requesting to join a game")
    
    if not player_id:
        logger.warning(f"Join attempt without player ID from connection: {connection_id}")
        return {'statusCode': 400, 'body': 'Player ID is required'}
    
    try:
        # Find active rooms with space
        room_name = None
        response = rooms_table.scan()
        
        # First look for any existing room with less than 5 players
        for room in response.get('Items', []):
            room_players = room.get('players', [])
            
            # Get counts of active players in the room by checking connections table
            active_players = []
            for pid in room_players:
                conn_response = connections_table.scan(
                    FilterExpression='player_id = :pid',
                    ExpressionAttributeValues={':pid': pid}
                )
                if conn_response.get('Items'):
                    active_players.append(pid)
            
            # If this room has space (less than 5 active players), join it
            if len(active_players) > 0 and len(active_players) < 5:
                room_name = room['room_name']
                logger.info(f"Found active room with space: {room_name}, current players: {len(active_players)}")
                break
        
        # If no suitable room found, create a new one with a unique ID
        if not room_name:
            room_name = f"game-{datetime.now().strftime('%Y%m%d%H%M%S')}-{player_id[:8]}"
            logger.info(f"Creating new room: {room_name} (no suitable existing rooms found)")
            
            rooms_table.put_item(
                Item={
                    'room_name': room_name,
                    'players': [],
                    'created_at': datetime.now().isoformat()
                }
            )
        
        # Update connection record with player info and room
        connections_table.update_item(
            Key={'connection_id': connection_id},
            UpdateExpression='SET player_id = :pid, room = :room',
            ExpressionAttributeValues={
                ':pid': player_id,
                ':room': room_name
            }
        )
        
        # Get the current player list for the room
        response = rooms_table.get_item(Key={'room_name': room_name})
        players = response['Item'].get('players', []) if 'Item' in response else []
        
        # Add player to room if not already there
        if player_id not in players:
            players.append(player_id)
            rooms_table.update_item(
                Key={'room_name': room_name},
                UpdateExpression='SET players = :players',
                ExpressionAttributeValues={':players': players}
            )
        
        # Send room info to the new player
        existing_players = [p for p in players if p != player_id]
        send_to_connection(connection_id, {
            'type': 'room_info',
            'players': existing_players
        })
        
        # Notify other players about the new player
        player_connections = get_player_connections(room_name)
        for pid, conn_id in player_connections.items():
            if pid != player_id:
                send_to_connection(conn_id, {
                    'type': 'new_player',
                    'playerId': player_id
                })
        
        logger.info(f"Player {player_id} successfully joined room {room_name}")
        return {'statusCode': 200, 'body': 'Joined room'}
    
    except Exception as e:
        logger.error(f"Error handling join for player {player_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_leave(connection_id, message):
    """Handle a player leaving a game room"""
    player_id = message.get('playerId')
    
    logger.info(f"Player {player_id} attempting to leave room")
    
    try:
        # Get player's current room
        response = connections_table.get_item(Key={'connection_id': connection_id})
        
        if 'Item' not in response:
            logger.warning(f"Connection not found for player {player_id}")
            return {'statusCode': 404, 'body': 'Connection not found'}
        
        player_data = response['Item']
        room_name = player_data.get('room')
        
        if not room_name:
            logger.warning(f"Player {player_id} not in a room")
            return {'statusCode': 400, 'body': 'Player not in a room'}
        
        logger.debug(f"Found player {player_id} in room {room_name}")
        
        # Handle player leaving
        handle_player_leave(room_name, player_id, connection_id)
        
        # Update connection record to remove room
        connections_table.update_item(
            Key={'connection_id': connection_id},
            UpdateExpression='SET room = :room',
            ExpressionAttributeValues={':room': None}
        )
        
        logger.info(f"Player {player_id} successfully left room {room_name}")
        return {'statusCode': 200, 'body': 'Left room'}
    
    except Exception as e:
        logger.error(f"Error handling leave for player {player_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_player_leave(room_name, player_id, connection_id):
    """Handle the cleanup when a player leaves a room"""
    logger.info(f"Handling leave cleanup for player {player_id} from room {room_name}")
    
    try:
        # Remove player from room
        response = rooms_table.get_item(Key={'room_name': room_name})
        
        if 'Item' in response:
            room_data = response['Item']
            players = room_data.get('players', [])
            
            logger.debug(f"Current players in room: {players}")
            
            if player_id in players:
                players.remove(player_id)
                rooms_table.update_item(
                    Key={'room_name': room_name},
                    UpdateExpression='SET players = :players',
                    ExpressionAttributeValues={':players': players}
                )
                logger.debug(f"Removed player {player_id} from room, remaining players: {players}")
            else:
                logger.warning(f"Player {player_id} not found in room player list")
            
            # Notify other players
            player_connections = get_player_connections(room_name)
            logger.debug(f"Found {len(player_connections)} other connections to notify")
            
            for pid, conn_id in player_connections.items():
                if pid != player_id:
                    player_left_message = {
                        'type': 'player_left',
                        'playerId': player_id
                    }
                    logger.debug(f"Notifying player {pid} about player {player_id} leaving")
                    send_result = send_to_connection(conn_id, player_left_message)
                    
                    if not send_result:
                        logger.warning(f"Failed to notify player {pid} about player {player_id} leaving")
        else:
            logger.warning(f"Room {room_name} not found when handling player leave")
    
    except Exception as e:
        logger.error(f"Error handling player {player_id} leave from room {room_name}: {str(e)}")
        logger.error(traceback.format_exc())

def handle_signaling_message(connection_id, message):
    """Handle WebRTC signaling messages (offer, answer, ice_candidate)"""
    message_type = message.get('type')
    from_player_id = message.get('from')
    to_player_id = message.get('to')
    
    logger.info(f"Handling {message_type} message from {from_player_id} to {to_player_id}")
    
    if not to_player_id:
        logger.warning(f"Signaling message without recipient from {connection_id}")
        return {'statusCode': 400, 'body': 'Recipient player ID is required'}
    
    try:
        # Get recipient's connection ID
        recipient_connection = get_connection_by_player_id(to_player_id)
        
        if not recipient_connection:
            logger.warning(f"Recipient {to_player_id} not found for signaling message")
            return {'statusCode': 404, 'body': 'Recipient not found or not connected'}
        
        logger.debug(f"Found recipient connection: {recipient_connection}")
        
        # Forward the message
        send_result = send_to_connection(recipient_connection, message)
        
        if send_result:
            logger.info(f"Successfully forwarded {message_type} from {from_player_id} to {to_player_id}")
            return {'statusCode': 200, 'body': f'{message_type} forwarded'}
        else:
            logger.warning(f"Failed to forward {message_type} to {to_player_id}")
            return {'statusCode': 500, 'body': f'Failed to send {message_type}'}
    
    except Exception as e:
        logger.error(f"Error handling signaling message: {str(e)}")
        logger.error(traceback.format_exc())
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def get_connection_by_player_id(player_id):
    """Get the connection ID for a specific player"""
    logger.debug(f"Looking up connection for player: {player_id}")
    
    try:
        # Query connections table for the player
        response = connections_table.scan(
            FilterExpression='player_id = :pid',
            ExpressionAttributeValues={':pid': player_id}
        )
        
        items = response.get('Items', [])
        logger.debug(f"Found {len(items)} connections for player {player_id}")
        
        if items:
            connection_id = items[0]['connection_id']
            logger.debug(f"Using connection: {connection_id} for player {player_id}")
            return connection_id
        
        logger.warning(f"No connection found for player: {player_id}")
        return None
    
    except Exception as e:
        logger.error(f"Error getting connection for player {player_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def get_player_connections(room_name):
    """Get all player connections in a room"""
    logger.debug(f"Getting player connections for room: {room_name}")
    
    try:
        # Scan for all connections in the room
        response = connections_table.scan(
            FilterExpression='room = :room',
            ExpressionAttributeValues={':room': room_name}
        )
        
        items = response.get('Items', [])
        logger.debug(f"Found {len(items)} connections in room {room_name}")
        
        # Create a mapping of player IDs to connection IDs
        player_connections = {}
        for item in items:
            player_id = item.get('player_id')
            if player_id:
                player_connections[player_id] = item['connection_id']
        
        logger.debug(f"Mapped {len(player_connections)} player IDs to connections")
        return player_connections
    
    except Exception as e:
        logger.error(f"Error getting player connections for room {room_name}: {str(e)}")
        logger.error(traceback.format_exc())
        return {}

def send_to_connection(connection_id, data):
    """Send a message to a WebSocket connection"""
    if not api_client:
        logger.error("API client not initialized for send_to_connection")
        return False
    
    logger.debug(f"Sending message to connection {connection_id}: {json.dumps(data)}")
    
    try:
        api_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data).encode('utf-8')
        )
        logger.debug(f"Message sent successfully to {connection_id}")
        return True
    
    except Exception as e:
        logger.error(f"Error sending message to connection {connection_id}: {str(e)}")
        
        # If the connection is gone, clean it up
        if 'GoneException' in str(e):
            logger.info(f"Connection {connection_id} is gone, cleaning up")
            try:
                connections_table.delete_item(Key={'connection_id': connection_id})
                logger.info(f"Cleaned up gone connection: {connection_id}")
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up connection: {str(cleanup_error)}")
        
        return False