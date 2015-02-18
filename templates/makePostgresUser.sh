#!/bin/sh

#sudo -i -u postgres 
sudo -u postgres psql --command "CREATE USER git WITH SUPERUSER PASSWORD 'git'" 
sudo -u postgres createdb -O git git


