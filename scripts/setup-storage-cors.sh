#!/bin/bash

# Setup CORS for Firebase Storage
echo "Setting up CORS for Firebase Storage..."
echo "Make sure you're logged in to Firebase CLI (firebase login)"
echo ""

# Get the project ID from .firebaserc or prompt user
if [ -f .firebaserc ]; then
    PROJECT_ID=$(grep -o '"default": "[^"]*' .firebaserc | grep -o '[^"]*$')
    echo "Found project: $PROJECT_ID"
else
    read -p "Enter your Firebase project ID: " PROJECT_ID
fi

# Apply CORS configuration
echo "Applying CORS configuration to gs://${PROJECT_ID}.appspot.com ..."
gsutil cors set storage.cors.json gs://${PROJECT_ID}.appspot.com

echo ""
echo "✅ CORS configuration applied successfully!"
echo ""
echo "Note: It may take a few minutes for the changes to propagate."
echo "Try refreshing your browser in a minute or two."