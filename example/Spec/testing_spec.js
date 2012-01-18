describe('testing',function() {

  it('should test true',function() {
    expect(test()).toBe(true);
  });

  describe('more testing',function() {

    it('should return test',function() {
      expect('test').toBe('test');
    });

  });

});
