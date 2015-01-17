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
      var accounts = testUtil.createAccountData();
      accountData.accounts = accounts;
    });

    it("should sort by 'date' column. first sort is descend, second sort is descend.", function(){
      accountData.sort("date");
      testUtil.verifySort(accountData.accounts, "date", false);
      accountData.sort("date");
      testUtil.verifySort(accountData.accounts, "date", true);
    });
    it("should sort by 'name' column. first sort is ascend, second sort is ascend.", function(){
      accountData.sort("name");
      testUtil.verifySort(accountData.accounts, "name", true);
      accountData.sort("name");
      testUtil.verifySort(accountData.accounts, "name", false);
    });
      
  });
});
