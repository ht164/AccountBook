/* define test utilities in global (testUtil). */

(function () {
  'use strict';

  // test utilities.
  window.testUtil = {
    createAccountData: function(cond){
      var accounts = [{
        id: "",
        name: "",
        date: "2015-01-01",
        tags: [],
        price: 0
      }, {
        id: "",
        name: "",
        date: "2015-12-31",
        tags: [],
        price: 0
      }, {
        id: "",
        name: "",
        date: "2015-01-02",
        tags: [],
        price: 0
      }];

      return accounts;
    },

    /**
     * verify sort.
     * 
     * @param {Array<account>} accounts data that will be verified.
     * @param {string} sortProperty column name.
     * @param {boolean} directrion sort direction. true is ascend, false is descend.
     */
    verifySort: function(accounts, sortProperty, direction){
      // pick up "sortProperty".
      var values = [];
      _.each(accounts, function(account){
        values.push(account[sortProperty]);
      });
      // verify sort.
      for (var i = 0; i < values.length - 1; i++){
        var r = direction ? values[i+1] < values[i] : values[i] < values[i+1];
        if (r){
          throw "verifying sort failed. i = " + i + ", values[i] = " + values[i] + ", values[i+1] = " + values[i+1];
        }
      }
    }
  };
})();
