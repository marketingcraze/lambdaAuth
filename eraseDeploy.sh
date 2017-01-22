#!/bin/bash

# remove API
AWSTools/deleteRestAPI.js

# remove lambdas INCOMPLETE
AWSTools/deleteLambda.js

# remove dbs
AWSTools/deleteDynamodb.js

# remove identity pools
AWSTools/deleteIdentityPool.js

# remove S3 buckets
AWSTools/deleteS3Bucket.js --type lambda

# remove roles
AWSTools/deleteRole.js --roleType api
AWSTools/deleteRole.js --roleType lambda
AWSTools/deleteRole.js --roleType cognito

# remove Angular client s3 bucket
AWSTools/deleteS3Bucket.js --type webClient
