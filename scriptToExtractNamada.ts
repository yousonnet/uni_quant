function extractAndJoinWords(input: string): string {
  // 使用正则表达式匹配所有单词
  const words = input.match(/\b[a-zA-Z]+\b/g) || [];
  // 使用空格连接所有单词
  return words.join(" ");
}

// 定义原始字符串
const rawString = `
  
`;

// 提取并连接单词
const result = extractAndJoinWords(rawString);

// 输出结果
console.log(result);
