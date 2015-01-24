/**
 * KiiCloud API mock
 * for application development.
 */

var Kii = {
  initializeWithSite: function(){
    // do nothing.
  }
};

var KiiSite = {
  JP: ""
};

var KiiUser = {
  authenticate: function(username, password, callbacks){
    // always success. call callback.
    setTimeout(callbacks.success, 0);
  },

  authenticateWithToken: function(token, callbacks){
    // always success. call callback.
    setTimeout(callbacks.success, 0);
  },

  getCurrentUser: function(){
    // return mock KiiUser object.
    return new _KiiUser();
  },
};

var _KiiUser = function(){};
_KiiUser.prototype = {
  bucketWithName: function(name){
    // return dummy KiiBucket object.
    return new _KiiBucket(name);
  }
};

var _KiiBucket = function(name){
  this.bucketName = name;
};
_KiiBucket.prototype = {
  bucketName: "",

  executeQuery: function(query, callbacks){
    // always success. call callback.
    if (this.bucketName == "account"){
      setTimeout(function(){
        callbacks.success(query, _Kii_generateDummyAccountResult());
      }, 0);
    } else if (this.bucketName == "tag"){
      setTimeout(function(){
        callbacks.success(query, _Kii_generateDummyTagResult());
      }, 0);
    }
  },

  createObject: function(){
    // return dummy KiiObject object.
    return new _KiiObject();
  }
}

var KiiClause = {
  greaterThanOrEqual: function(){
    // return dummy object.
    return {};
  },

  lessThanOrEqual: function(){
    // return dummy object.
    return {};
  },

  and: function(){
    // return dummy object.
    return {};
  }
};

var KiiQuery = {
  queryWithClause: function(){
    // return dummy object.
    return {};
  }
};

var KiiObject = {
  objectWithURI: function(){
    // return dummy _KiiObject.
    return new _KiiObject();
  }
};

var _KiiObject = function(){};
_KiiObject.prototype = {
  set: function(){
    // do nothing.
  },

  save: function(callbacks){
    // always success. call callback.
    setTimeout(function(){
      callbacks.success(new _KiiObject());
    }, 0);
  },

  objectURI: function(){
    // return dummy uri.
    return "dummyURI_" + _.random(10000, 99999);
  }
};

// dummy account data.
var _Kii_dummyAccountData = [{
    id: "ID_1", 
    date: new Date("2015-01-01"),
    name: "NAME_1",
    tags: [],
    price: 1000
  }, {
    id: "ID_2", 
    date: new Date("2015-01-02"),
    name: "NAME_2",
    tags: ["ID_1"],
    price: 2000
  }, {
    id: "ID_3", 
    date: new Date("2015-01-03"),
    name: "NAME_3",
    tags: ["ID_2", "ID_3"],
    price: 3000
  }, {
    id: "ID_4", 
    date: new Date("2015-01-04"),
    name: "NAME_4",
    tags: ["ID_1", "ID_2", "ID_3"],
    price: 4000
  }];

var _Kii_generateDummyAccountResult = function(){
  var resultSet = [];
  _.each(_Kii_dummyAccountData, function(data, index){
    resultSet.push(_.extend(new _KiiObject(), {
      get: function(param){
        return _Kii_dummyAccountData[index][param];
      }
    }));
  });
  return resultSet;
};

// dummy tag data.
var _Kii_dummyTagData = [{
    id: "ID_1", 
    name: "TAG_1"
  }, {
    id: "ID_2", 
    name: "TAG_2"
  }, {
    id: "ID_3",
    name: "TAG_3"
  }];

var _Kii_generateDummyTagResult = function(){
  var resultSet = [];
  _.each(_Kii_dummyTagData, function(data, index){
    resultSet.push(_.extend(new _KiiObject(), {
      get: function(param){
        return _Kii_dummyTagData[index][param];
      }
    }));
  });
  return resultSet;
};

