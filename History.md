2.0.6 / 2018-12-04
==================
 * fix: use `deleteOne()` and `deleteMany()` instead of deprecated `remove()` #60 #59 [ramicohen303](https://github.com/ramicohen303)

2.0.5 / 2018-11-17
==================
 * fix: use `updateOne()` instead of deprecated `update()` #58 #57 [johannordin](https://github.com/johannordin)

2.0.4 / 2018-11-12
==================
 * fix: upgrade mongodb driver -> 3.1.8 and set `useNewUrlParser` by default #55 [ddtraceweb](https://github.com/ddtraceweb)

2.0.3 / 2018-06-06
==================
 * fix: expose store.client property so you can disconnect properly #52

2.0.2 / 2018-03-27
==================
 * fix: use client.db() syntax to support getting db name from URI with replica set #50

2.0.1 / 2018-03-13
==================
 * fix: pull databaseName from URI by default for backwards compat #51 #50
