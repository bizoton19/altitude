#!/bin/bash
# Script to add GitHub remote and push repository
# Run this after creating the repository on GitHub.com

echo "🚀 Setting up GitHub remote for Altitude repository..."

# Update this with your actual GitHub username if different
GITHUB_USER="bizoton19"
REPO_NAME="altitude"

echo ""
echo "Choose your repository visibility:"
echo "1) Public (HTTPS)"
echo "2) Private (HTTPS)"
echo "3) Public (SSH)"
echo "4) Private (SSH)"
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
    ;;
  2)
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
    ;;
  3)
    REMOTE_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
    ;;
  4)
    REMOTE_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
    ;;
  *)
    echo "Invalid choice. Using HTTPS public..."
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
    ;;
esac

echo ""
echo "Adding remote: origin -> ${REMOTE_URL}"
git remote add origin "${REMOTE_URL}" 2>/dev/null || git remote set-url origin "${REMOTE_URL}"

echo "Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"

echo ""
echo "Pushing to GitHub..."
if [ "$choice" = "1" ] || [ "$choice" = "2" ]; then
  echo "⚠️  For HTTPS, you may need to enter your GitHub credentials."
  echo "   Consider using a Personal Access Token instead of password."
fi

git push -u origin "${CURRENT_BRANCH}"

echo ""
echo "✅ Done! Your repository is now on GitHub."
echo "   View it at: https://github.com/${GITHUB_USER}/${REPO_NAME}"

