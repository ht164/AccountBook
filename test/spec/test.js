/* global describe, it */

(function () {
  'use strict';

  describe('Module(Test)', function () {
    describe('Method(Test)', function () {
      it('Expect(Test)', function () {
        expect(1).to.equal(1);
      });
    });
  });

  // test utilities.
  var testUtil = {
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

    verifySort: function(accounts, sortProperty){
      // pick up "sortProperty".
      var values = [];
      _.each(accounts, function(account){
        values.push(account[sortProperty]);
      });
      // verify sort.
      for (var i = 0; i < values.length - 1; i++){
        if (values[i] > values[i + 1]){
          throw "verifying sort failed.";
        }
      }
    }
  };

  describe("accountData", function(){
    beforeEach(module("ABApp"));

    var accountData;

    beforeEach(inject(function(_accountData_){
      accountData = _accountData_;
    }));

    describe("sort", function(){
      it("should sort by 'date' column (column 1)", function(){
        var accounts = [{
          id: "",
          name: "",
          date: "2015-01-01",
          tags: [],
          price: 0
        },
        {
          id: "",
          name: "",
          date: "2015-12-31",
          tags: [],
          price: 0
        },
        {
          id: "",
          name: "",
          date: "2015-01-02",
          tags: [],
          price: 0
        }
        ];

        accountData.accounts = accounts;
        accountData.sort('date');
        testUtil.verifySort(accountData.accounts);
      });
    });
  });
})();



