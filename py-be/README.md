# Daily 6 PM Lambda Function

This is a simple AWS Lambda function that runs daily at 6 PM. The function is currently set up as a template that you can customize with your specific business logic.

## Setup Instructions

1. **Create a Lambda Function in AWS Console**

   - Go to AWS Lambda Console
   - Click "Create function"
   - Choose "Author from scratch"
   - Enter a function name
   - Select Python 3.9 or later as the runtime
   - Click "Create function"

2. **Upload the Code**

   - Copy the contents of `lambda_function.py`
   - Paste it into the Lambda function code editor
   - Click "Deploy"

3. **Set up CloudWatch Events (EventBridge) Rule**

   - In the Lambda function page, click on "Add trigger"
   - Select "EventBridge (CloudWatch Events)"
   - Click "Create a new rule"
   - Enter a rule name
   - Select "Schedule expression"
   - Enter the following cron expression: `0 18 * * ? *` (This runs at 6 PM UTC daily)
   - Click "Add"

4. **Configure Basic Settings**
   - Set the timeout to an appropriate value (default is 3 seconds)
   - Set the memory to an appropriate value (default is 128 MB)
   - Configure any environment variables if needed

## Customization

To add your specific business logic:

1. Open `lambda_function.py`
2. Add your code in the section marked "Add your business logic here"
3. Deploy the updated function

## Testing

You can test the function by:

1. Clicking the "Test" button in the Lambda console
2. Creating a test event (the default test event is fine for this function)
3. Clicking "Test" to execute the function

## Monitoring

You can monitor the function's execution in:

- CloudWatch Logs
- CloudWatch Metrics
- Lambda function metrics in the AWS Console
