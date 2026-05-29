#!/bin/bash
# Wrapper to run the Python User Manager CLI script with virtualenv
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../.."
export PYTHONPATH="backend"
source venv_py311_new/Scripts/activate || source venv_py311_new/bin/activate
python backend/scripts/manage-users.py
