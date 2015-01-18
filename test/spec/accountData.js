/* global describe, it */

describe("accountData", function(){
  beforeEach(module("ABApp"));

  describe("sort", function(){
    // accountData module.
    var accountData;
    beforeEach(inject(function(_accountData_){
      accountData = _accountData_;
    }));

    // create account data for each test.
    beforeEach(function(){
      var accounts = testUtil.createAccountData({ num: 5 });
      accountData.accounts = accounts;
    });

    it("should sort by 'date' column. sort direction is descend > ascend > descend.", function(){
      var sortKey = "date";
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, false);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, true);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, false);
    });
    it("should sort by 'name' column. sort direction is ascend > descend > ascend.", function(){
      var sortKey = "name";
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, true);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, false);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, true);
    });
    it("should sort by 'price' column. sort direction is ascend > descend > ascend.", function(){
      var sortKey = "price";
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, true);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, false);
      accountData.sort(sortKey);
      testUtil.verifySort(accountData.accounts, sortKey, true);
    });
      
  });
});
