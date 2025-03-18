import os
import boto3

def upload_directory_to_s3(local_directory: str, bucket_name: str, s3_base_path: str = ""):
    """
    Uploads files from a local directory to an S3 bucket while maintaining directory structure.
    
    :param local_directory: The path to the local directory to upload.
    :param bucket_name: The name of the S3 bucket.
    :param s3_base_path: The base path in the S3 bucket (optional).
    """
    s3_client = boto3.client('s3', region_name='us-west-2')
    
    for root, _, files in os.walk(local_directory):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_directory)
            s3_path = os.path.join(s3_base_path, relative_path).replace("\\", "/")  # Ensure S3 path uses forward slashes
            
            print(f"Uploading {local_path} to s3://{bucket_name}/{s3_path}")
            s3_client.upload_file(local_path, bucket_name, s3_path)

def invalidate_cloudfront(distribution_id: str):
    """
    Creates an invalidation request for the specified CloudFront distribution.
    
    :param distribution_id: The ID of the CloudFront distribution to invalidate.
    """
    cloudfront_client = boto3.client('cloudfront')
    invalidation = cloudfront_client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': 1,
                'Items': ['/*']
            },
            'CallerReference': str(os.urandom(16))
        }
    )
    print(f"Created CloudFront invalidation: {invalidation['Invalidation']['Id']}")

if __name__ == "__main__":
    # Set AWS environment variables
    os.environ["AWS_ACCESS_KEY_ID"] = "your-access-key"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "your-secret-key"
    os.environ["AWS_DEFAULT_REGION"] = "us-west-2"
    
    bucket_name = "arcade-1"
    local_directory = "./"  # Base directory containing all assets
    distribution_id = "EVFRLCI7UZNJ"  # CloudFront distribution ID
    
    upload_directory_to_s3(local_directory, bucket_name)
    invalidate_cloudfront(distribution_id)    