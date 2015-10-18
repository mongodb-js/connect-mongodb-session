mkdir -p vendor
cd vendor
curl -OL https://github.com/strongloop/express/archive/3.18.1.tar.gz
tar -zxvf 3.18.1.tar.gz
rm 3.18.1.tar.gz
cd express-3.18.1
npm install
cd ../..
