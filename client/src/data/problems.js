export const PROBLEMS = [
    {
        id: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        tags: ["array", "hash map"],
        summary: "Find the two numbers that add up to a target.",
        statement: [
            "Given an array of integers and a target, find the two different positions whose values add up to the target.",
            "Exactly one valid pair exists. Print the smaller index first.",
        ],
        input: ["Line 1: n, the array length", "Line 2: n integers", "Line 3: the target"],
        output: ["Two indices (0-based) separated by a space, smaller first"],
        tests: [
            { name: "Basic", input: "4\n2 7 11 15\n9", expected: "0 1" },
            { name: "Middle pair", input: "3\n3 2 4\n6", expected: "1 2" },
            { name: "Duplicates", input: "2\n3 3\n6", expected: "0 1" },
        ],
    },
    {
        id: "fizzbuzz",
        title: "FizzBuzz",
        difficulty: "Easy",
        tags: ["loops", "math"],
        summary: "Print numbers, swapping multiples of 3 and 5 for words.",
        statement: [
            "Print the numbers from 1 to n, one per line.",
            "For multiples of 3 print Fizz, for multiples of 5 print Buzz, and for multiples of both print FizzBuzz.",
        ],
        input: ["Line 1: n"],
        output: ["n lines"],
        tests: [
            { name: "n = 5", input: "5", expected: "1\n2\nFizz\n4\nBuzz" },
            {
                name: "n = 15",
                input: "15",
                expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
            },
        ],
    },
    {
        id: "valid-parentheses",
        title: "Valid Parentheses",
        difficulty: "Easy",
        tags: ["stack", "string"],
        summary: "Check that every bracket is closed in the right order.",
        statement: [
            "A string contains only the characters ( ) [ ] { }.",
            "It is valid if every opening bracket is closed by the same type of bracket, in the correct order.",
        ],
        input: ["Line 1: the string"],
        output: ["true or false"],
        tests: [
            { name: "All types", input: "()[]{}", expected: "true" },
            { name: "Mismatch", input: "(]", expected: "false" },
            { name: "Nested", input: "{[]}", expected: "true" },
            { name: "Wrong order", input: "([)]", expected: "false" },
        ],
    },
    {
        id: "reverse-words",
        title: "Reverse Words",
        difficulty: "Easy",
        tags: ["string"],
        summary: "Reverse the order of the words in a sentence.",
        statement: [
            "Given a sentence, print its words in reverse order, separated by a single space.",
        ],
        input: ["Line 1: a sentence of words separated by single spaces"],
        output: ["The words in reverse order"],
        tests: [
            { name: "Sentence", input: "the sky is blue", expected: "blue is sky the" },
            { name: "One word", input: "hello", expected: "hello" },
            { name: "Three words", input: "a good example", expected: "example good a" },
        ],
    },
    {
        id: "longest-substring",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        tags: ["sliding window", "hash set"],
        summary: "Length of the longest stretch with no repeated character.",
        statement: [
            "Given a string, find the length of the longest substring that contains no repeated characters.",
        ],
        input: ["Line 1: the string (not empty)"],
        output: ["A single integer"],
        tests: [
            { name: "abcabcbb", input: "abcabcbb", expected: "3" },
            { name: "All same", input: "bbbbb", expected: "1" },
            { name: "pwwkew", input: "pwwkew", expected: "3" },
        ],
    },
    {
        id: "merge-intervals",
        title: "Merge Intervals",
        difficulty: "Medium",
        tags: ["sorting", "intervals"],
        summary: "Combine all overlapping intervals.",
        statement: [
            "Given a list of intervals, merge all that overlap (touching at an endpoint counts as overlapping).",
            "Print the merged intervals sorted by start.",
        ],
        input: ["Line 1: n, the number of intervals", "Next n lines: start end"],
        output: ["One merged interval per line, as: start end"],
        tests: [
            {
                name: "Example",
                input: "4\n1 3\n2 6\n8 10\n15 18",
                expected: "1 6\n8 10\n15 18",
            },
            { name: "Touching", input: "2\n1 4\n4 5", expected: "1 5" },
            { name: "Unsorted input", input: "3\n1 4\n0 4\n3 5", expected: "0 5" },
        ],
    },
    {
        id: "climbing-stairs",
        title: "Climbing Stairs",
        difficulty: "Easy",
        tags: ["dynamic programming"],
        summary: "Count the ways to climb n steps, 1 or 2 at a time.",
        statement: [
            "You are climbing a staircase with n steps. Each move climbs 1 or 2 steps.",
            "Print the number of distinct ways to reach the top.",
        ],
        input: ["Line 1: n (1 ≤ n ≤ 40)"],
        output: ["A single integer"],
        tests: [
            { name: "n = 2", input: "2", expected: "2" },
            { name: "n = 3", input: "3", expected: "3" },
            { name: "n = 5", input: "5", expected: "8" },
            { name: "n = 10", input: "10", expected: "89" },
        ],
    },
    {
        id: "best-time-to-buy-sell-stock",
        title: "Best Time to Buy and Sell Stock",
        difficulty: "Easy",
        tags: ["array", "greedy"],
        summary: "Find the maximum profit from one buy and one sell.",
        statement: [
            "Given an array of stock prices, choose one day to buy and a later day to sell.",
            "Print the maximum profit. If no profit is possible, print 0.",
        ],
        input: ["Line 1: n, the number of days", "Line 2: n stock prices"],
        output: ["The maximum profit"],
        tests: [
            { name: "Example", input: "6\n7 1 5 3 6 4", expected: "5" },
            { name: "Decreasing prices", input: "5\n7 6 4 3 1", expected: "0" },
            { name: "Single increase", input: "4\n2 4 1 8", expected: "7" },
        ],
    },
    {
        id: "contains-duplicate",
        title: "Contains Duplicate",
        difficulty: "Easy",
        tags: ["array", "hash set"],
        summary: "Determine whether an array contains duplicate values.",
        statement: [
            "Given an array of integers, determine whether any value appears at least twice.",
            "Print true if a duplicate exists; otherwise, print false.",
        ],
        input: ["Line 1: n, the array length", "Line 2: n integers"],
        output: ["true or false"],
        tests: [
            { name: "Duplicate exists", input: "4\n1 2 3 1", expected: "true" },
            { name: "All unique", input: "4\n1 2 3 4", expected: "false" },
            { name: "Repeated values", input: "3\n5 5 5", expected: "true" },
        ],
    },
    {
        id: "maximum-subarray",
        title: "Maximum Subarray",
        difficulty: "Medium",
        tags: ["array", "dynamic programming", "kadane"],
        summary: "Find the largest sum of a contiguous subarray.",
        statement: [
            "Given an integer array, find the maximum possible sum of a non-empty contiguous subarray.",
            "Print the maximum sum.",
        ],
        input: ["Line 1: n, the array length", "Line 2: n integers"],
        output: ["The maximum subarray sum"],
        tests: [
            {
                name: "Mixed numbers",
                input: "9\n-2 1 -3 4 -1 2 1 -5 4",
                expected: "6",
            },
            { name: "All negative", input: "3\n-3 -1 -2", expected: "-1" },
            { name: "All positive", input: "4\n1 2 3 4", expected: "10" },
        ],
    },
    {
        id: "valid-anagram",
        title: "Valid Anagram",
        difficulty: "Easy",
        tags: ["string", "hash map", "sorting"],
        summary: "Check whether two strings contain the same characters.",
        statement: [
            "Given two strings, determine whether one is an anagram of the other.",
            "Both strings must contain the same characters with the same frequencies.",
            "Print true if they are anagrams; otherwise, print false.",
        ],
        input: ["Line 1: the first string", "Line 2: the second string"],
        output: ["true or false"],
        tests: [
            { name: "Valid anagram", input: "listen\nsilent", expected: "true" },
            { name: "Different characters", input: "rat\ncar", expected: "false" },
            { name: "Different lengths", input: "ab\na", expected: "false" },
        ],
    },
    {
        id: "valid-palindrome",
        title: "Valid Palindrome",
        difficulty: "Easy",
        tags: ["string", "two pointers"],
        summary: "Check whether a string is a palindrome ignoring punctuation and case.",
        statement: [
            "Given a string, determine whether it reads the same forward and backward.",
            "Ignore non-alphanumeric characters and treat uppercase and lowercase letters as equal.",
            "Print true if it is a palindrome; otherwise, print false.",
        ],
        input: ["Line 1: the string"],
        output: ["true or false"],
        tests: [
            {
                name: "Classic example",
                input: "A man, a plan, a canal: Panama",
                expected: "true",
            },
            { name: "Not a palindrome", input: "race a car", expected: "false" },
            { name: "Only punctuation", input: "!!!", expected: "true" },
        ],
    },
    {
        id: "move-zeroes",
        title: "Move Zeroes",
        difficulty: "Easy",
        tags: ["array", "two pointers"],
        summary: "Move all zeroes to the end without changing other elements' order.",
        statement: [
            "Given an array of integers, move every zero to the end.",
            "Preserve the relative order of all non-zero elements.",
            "Print the resulting array on one line.",
        ],
        input: ["Line 1: n, the array length", "Line 2: n integers"],
        output: ["The rearranged array, separated by spaces"],
        tests: [
            {
                name: "Multiple zeroes",
                input: "5\n0 1 0 3 12",
                expected: "1 3 12 0 0",
            },
            { name: "No zeroes", input: "3\n1 2 3", expected: "1 2 3" },
            { name: "All zeroes", input: "3\n0 0 0", expected: "0 0 0" },
        ],
    },
    {
        id: "binary-search",
        title: "Binary Search",
        difficulty: "Easy",
        tags: ["array", "binary search"],
        summary: "Find a target value in a sorted array.",
        statement: [
            "Given a sorted array of distinct integers and a target, find the target's 0-based index.",
            "Print -1 if the target is not present.",
        ],
        input: [
            "Line 1: n, the array length",
            "Line 2: n sorted integers",
            "Line 3: the target",
        ],
        output: ["The target's 0-based index, or -1"],
        tests: [
            { name: "Target found", input: "6\n-1 0 3 5 9 12\n9", expected: "4" },
            { name: "Target missing", input: "4\n1 3 5 7\n2", expected: "-1" },
            { name: "Single element", input: "1\n8\n8", expected: "0" },
        ],
    },
    {
        id: "product-except-self",
        title: "Product of Array Except Self",
        difficulty: "Medium",
        tags: ["array", "prefix product"],
        summary: "Calculate each position's product without using its own value.",
        statement: [
            "Given an integer array, return an array where each position contains the product of all other elements.",
            "Do not use division.",
            "Print the resulting values separated by spaces.",
        ],
        input: ["Line 1: n, the array length", "Line 2: n integers"],
        output: ["The product array, separated by spaces"],
        tests: [
            {
                name: "Positive numbers",
                input: "4\n1 2 3 4",
                expected: "24 12 8 6",
            },
            {
                name: "Contains zero",
                input: "3\n-1 1 0",
                expected: "0 0 -1",
            },
            {
                name: "Two elements",
                input: "2\n3 5",
                expected: "5 3",
            },
        ],
    },
    {
        id: "two-sum-sorted",
        title: "Two Sum II",
        difficulty: "Medium",
        tags: ["array", "two pointers"],
        summary: "Find two numbers in a sorted array that equal the target.",
        statement: [
            "Given a sorted array of integers and a target, find two distinct positions whose values sum to the target.",
            "Print the two 0-based indices in ascending order.",
            "Exactly one valid pair exists.",
        ],
        input: [
            "Line 1: n, the array length",
            "Line 2: n sorted integers",
            "Line 3: the target",
        ],
        output: ["Two 0-based indices separated by a space, smaller first"],
        tests: [
            { name: "Basic", input: "4\n2 7 11 15\n9", expected: "0 1" },
            { name: "Middle pair", input: "3\n2 3 4\n6", expected: "0 2" },
            { name: "Negative values", input: "4\n-3 -1 2 4\n1", expected: "1 2" },
        ],
    },
    {
        id: "merge-sorted-arrays",
        title: "Merge Two Sorted Arrays",
        difficulty: "Easy",
        tags: ["array", "two pointers", "sorting"],
        summary: "Merge two sorted arrays into one sorted array.",
        statement: [
            "Given two arrays sorted in non-decreasing order, merge them into a single sorted array.",
            "Print all elements of the merged array separated by spaces.",
        ],
        input: [
            "Line 1: n, the first array length",
            "Line 2: n integers",
            "Line 3: m, the second array length",
            "Line 4: m integers",
        ],
        output: ["The merged sorted array, separated by spaces"],
        tests: [
            {
                name: "Both arrays non-empty",
                input: "3\n1 2 4\n3\n1 3 4",
                expected: "1 1 2 3 4 4",
            },
            {
                name: "One empty array",
                input: "0\n\n3\n2 5 7",
                expected: "2 5 7",
            },
            {
                name: "Negative values",
                input: "2\n-3 0\n2\n-2 4",
                expected: "-3 -2 0 4",
            },
        ],
    },
    {
        id: "longest-palindromic-substring",
        title: "Longest Palindromic Substring",
        difficulty: "Medium",
        tags: ["string", "two pointers", "dynamic programming"],
        summary: "Find the longest contiguous palindromic substring.",
        statement: [
            "Given a non-empty string, find a longest substring that is a palindrome.",
            "If multiple answers have the same maximum length, print any one of them.",
        ],
        input: ["Line 1: the string"],
        output: ["A longest palindromic substring"],
        tests: [
            {
                name: "Odd-length palindrome",
                input: "babad",
                expected: "bab",
            },
            {
                name: "Even-length palindrome",
                input: "cbbd",
                expected: "bb",
            },
            { name: "Single character", input: "a", expected: "a" },
        ],
    },
    {
        id: "container-with-most-water",
        title: "Container With Most Water",
        difficulty: "Medium",
        tags: ["array", "two pointers", "greedy"],
        summary: "Find two lines that hold the maximum amount of water.",
        statement: [
            "Given an array where each value represents a vertical line's height, choose two lines that form a container.",
            "The container's area is the distance between the lines multiplied by the smaller height.",
            "Print the maximum possible area.",
        ],
        input: ["Line 1: n, the number of heights", "Line 2: n non-negative integers"],
        output: ["The maximum area"],
        tests: [
            {
                name: "Standard example",
                input: "9\n1 8 6 2 5 4 8 3 7",
                expected: "49",
            },
            { name: "Two lines", input: "2\n1 1", expected: "1" },
            { name: "Increasing heights", input: "4\n1 2 3 4", expected: "4" },
        ],
    },
    {
        id: "number-of-islands",
        title: "Number of Islands",
        difficulty: "Medium",
        tags: ["graph", "bfs", "dfs", "matrix"],
        summary: "Count connected groups of land in a grid.",
        statement: [
            "Given a grid containing only 0 and 1, count the islands.",
            "1 represents land and 0 represents water.",
            "Land cells are connected horizontally or vertically, not diagonally.",
        ],
        input: [
            "Line 1: rows and columns",
            "Next rows lines: each row as a string of 0s and 1s",
        ],
        output: ["The number of islands"],
        tests: [
            {
                name: "Multiple islands",
                input: "4 5\n11000\n11000\n00100\n00011",
                expected: "3",
            },
            { name: "All water", input: "2 3\n000\n000", expected: "0" },
            { name: "All land", input: "2 2\n11\n11", expected: "1" },
        ],
    },
    {
        id: "top-k-frequent",
        title: "Top K Frequent Elements",
        difficulty: "Medium",
        tags: ["array", "hash map", "heap"],
        summary: "Find the k most frequent values in an array.",
        statement: [
            "Given an integer array and k, return the k most frequent distinct values.",
            "If frequencies tie, the smaller integer must come first.",
            "Print the selected values separated by spaces, ordered by descending frequency and then ascending value.",
        ],
        input: [
            "Line 1: n, the array length",
            "Line 2: n integers",
            "Line 3: k",
        ],
        output: ["The k most frequent distinct values in the specified order"],
        tests: [
            {
                name: "Different frequencies",
                input: "6\n1 1 1 2 2 3\n2",
                expected: "1 2",
            },
            {
                name: "Frequency tie",
                input: "6\n4 4 2 2 3 3\n2",
                expected: "2 3",
            },
            {
                name: "One result",
                input: "4\n5 5 6 7\n1",
                expected: "5",
            },
        ],
    },
    {
        id: "house-robber",
        title: "House Robber",
        difficulty: "Medium",
        tags: ["array", "dynamic programming"],
        summary: "Maximize the money stolen without robbing adjacent houses.",
        statement: [
            "Each array element represents the money in a house.",
            "You cannot rob two adjacent houses.",
            "Print the maximum amount that can be collected.",
        ],
        input: ["Line 1: n, the number of houses", "Line 2: n non-negative integers"],
        output: ["The maximum amount"],
        tests: [
            { name: "Standard example", input: "4\n1 2 3 1", expected: "4" },
            { name: "Choose alternate houses", input: "5\n2 7 9 3 1", expected: "12" },
            { name: "One house", input: "1\n8", expected: "8" },
        ],
    },
    {
        id: "coin-change",
        title: "Coin Change",
        difficulty: "Medium",
        tags: ["dynamic programming", "array"],
        summary: "Find the minimum number of coins needed to make an amount.",
        statement: [
            "Given coin denominations and a target amount, find the minimum number of coins needed to make that amount.",
            "You may use each denomination any number of times.",
            "Print -1 if the amount cannot be made.",
        ],
        input: [
            "Line 1: n, the number of denominations",
            "Line 2: n positive coin values",
            "Line 3: the target amount",
        ],
        output: ["The minimum number of coins, or -1"],
        tests: [
            { name: "Possible amount", input: "3\n1 2 5\n11", expected: "3" },
            { name: "Impossible amount", input: "1\n2\n3", expected: "-1" },
            { name: "Zero amount", input: "2\n1 3\n0", expected: "0" },
        ],
    },
    {
        id: "reverse-linked-list",
        title: "Reverse Linked List",
        difficulty: "Easy",
        tags: ["linked list", "recursion", "pointers"],
        summary: "Reverse the order of elements in a linked list.",
        statement: [
            "Given the values of a singly linked list in order, reverse the list.",
            "Print the reversed values separated by spaces.",
        ],
        input: ["Line 1: n, the number of nodes", "Line 2: n integers"],
        output: ["The values in reverse order, separated by spaces"],
        tests: [
            { name: "Multiple nodes", input: "5\n1 2 3 4 5", expected: "5 4 3 2 1" },
            { name: "One node", input: "1\n7", expected: "7" },
            { name: "Two nodes", input: "2\n2 1", expected: "1 2" },
        ],
    },
    {
        id: "linked-list-cycle",
        title: "Linked List Cycle",
        difficulty: "Easy",
        tags: ["linked list", "two pointers"],
        summary: "Determine whether a linked list contains a cycle.",
        statement: [
            "For this problem, the input is a sequence of node values and a 0-based cycle position.",
            "The last node points to the node at that position. A cycle position of -1 means the last node points to null.",
            "Print true if the linked list contains a cycle; otherwise, print false.",
        ],
        input: [
            "Line 1: n, the number of nodes",
            "Line 2: n integers",
            "Line 3: the 0-based cycle position, or -1",
        ],
        output: ["true or false"],
        tests: [
            { name: "Cycle exists", input: "4\n3 2 0 -4\n1", expected: "true" },
            { name: "No cycle", input: "2\n1 2\n-1", expected: "false" },
            { name: "Cycle at head", input: "1\n1\n0", expected: "true" },
        ],
    },
    {
        id: "course-schedule",
        title: "Course Schedule",
        difficulty: "Medium",
        tags: ["graph", "topological sort", "dfs", "bfs"],
        summary: "Determine whether all courses can be completed.",
        statement: [
            "There are n courses numbered from 0 to n - 1.",
            "Each prerequisite pair a b means course b must be completed before course a.",
            "Print true if all courses can be completed; otherwise, print false.",
        ],
        input: [
            "Line 1: n and m, the number of courses and prerequisites",
            "Next m lines: a b, meaning b is a prerequisite for a",
        ],
        output: ["true or false"],
        tests: [
            { name: "No cycle", input: "2 1\n1 0", expected: "true" },
            { name: "Cycle exists", input: "2 2\n1 0\n0 1", expected: "false" },
            { name: "No prerequisites", input: "3 0", expected: "true" },
        ],
    },
    {
        id: "merge-two-sorted-lists",
        title: "Merge Two Sorted Lists",
        difficulty: "Easy",
        tags: ["Linked List", "Recursion"],
        summary: "Merge two sorted linked lists into one sorted list.",
        statement: [
            "You are given the heads of two sorted linked lists.",
            "Merge them into one sorted linked list and return its head."
        ],
        input: ["First sorted list", "Second sorted list"],
        output: ["Merged sorted list"],
        tests: [
            { name: "Basic", input: "1 2 4\n1 3 4", expected: "1 1 2 3 4 4" },
            { name: "Different lengths", input: "1 5\n2 3 4", expected: "1 2 3 4 5" },
            { name: "Empty lists", input: "\n", expected: "" }
        ]
    },
    {
        id: "remove-duplicates-sorted-array",
        title: "Remove Duplicates from Sorted Array",
        difficulty: "Easy",
        tags: ["Array", "Two Pointers"],
        summary: "Remove duplicates in-place from a sorted array.",
        statement: [
            "Given a sorted array, remove duplicates in-place.",
            "Return the number of unique elements and preserve their order."
        ],
        input: ["A sorted array of integers"],
        output: ["Unique elements followed by their count"],
        tests: [
            { name: "Duplicates", input: "6\n1 1 2 2 3 3", expected: "1 2 3\n3" },
            { name: "No duplicates", input: "3\n1 2 3", expected: "1 2 3\n3" }
        ]
    },
    {
        id: "rotate-array",
        title: "Rotate Array",
        difficulty: "Medium",
        tags: ["Array", "Two Pointers"],
        summary: "Rotate an array to the right by k positions.",
        statement: [
            "Given an integer array and an integer k, rotate the array right by k positions.",
            "Handle k values larger than the array length."
        ],
        input: ["Array length and elements", "Integer k"],
        output: ["Rotated array"],
        tests: [
            { name: "Basic", input: "7\n1 2 3 4 5 6 7\n3", expected: "5 6 7 1 2 3 4" },
            { name: "Large k", input: "3\n1 2 3\n4", expected: "3 1 2" }
        ]
    },
    {
        id: "majority-element",
        title: "Majority Element",
        difficulty: "Easy",
        tags: ["Array", "Hash Map", "Boyer-Moore"],
        summary: "Find the element appearing more than n/2 times.",
        statement: [
            "Given an array, find the element that appears more than half the time.",
            "You may assume a majority element always exists."
        ],
        input: ["Array length and elements"],
        output: ["Majority element"],
        tests: [
            { name: "Basic", input: "3\n3 2 3", expected: "3" },
            { name: "Repeated element", input: "7\n2 2 1 1 1 2 2", expected: "2" }
        ]
    },
    {
        id: "three-sum",
        title: "3Sum",
        difficulty: "Medium",
        tags: ["Array", "Sorting", "Two Pointers"],
        summary: "Find unique triplets whose sum equals zero.",
        statement: [
            "Given an integer array, find all unique triplets whose sum is zero.",
            "Output each triplet in sorted order, with triplets sorted lexicographically."
        ],
        input: ["Array length and elements"],
        output: ["One triplet per line"],
        tests: [
            { name: "Basic", input: "6\n-1 0 1 2 -1 -4", expected: "-1 -1 2\n-1 0 1" },
            { name: "No triplets", input: "3\n1 2 3", expected: "" }
        ]
    },
    {
        id: "minimum-size-subarray-sum",
        title: "Minimum Size Subarray Sum",
        difficulty: "Medium",
        tags: ["Array", "Sliding Window"],
        summary: "Find the shortest subarray with sum at least a target.",
        statement: [
            "Given a positive integer target and an array of positive integers, find the minimum length of a contiguous subarray whose sum is at least target.",
            "Return zero if no such subarray exists."
        ],
        input: ["Target", "Array length and elements"],
        output: ["Minimum length"],
        tests: [
            { name: "Basic", input: "7\n6\n2 3 1 2 4 3", expected: "2" },
            { name: "No solution", input: "20\n3\n1 2 3", expected: "0" }
        ]
    },
    {
        id: "group-anagrams",
        title: "Group Anagrams",
        difficulty: "Medium",
        tags: ["String", "Hash Map", "Sorting"],
        summary: "Group words that are anagrams of one another.",
        statement: [
            "Given a list of strings, group anagrams together.",
            "Sort words within each group and sort the groups lexicographically for deterministic output."
        ],
        input: ["Number of words", "One word per line"],
        output: ["One sorted group per line"],
        tests: [
            { name: "Basic", input: "6\neat\ntea\ntan\nate\nnat\nbat", expected: "ate eat tea\nnat tan\nbat" }
        ]
    },
    {
        id: "longest-common-prefix",
        title: "Longest Common Prefix",
        difficulty: "Easy",
        tags: ["String"],
        summary: "Find the longest prefix shared by all strings.",
        statement: [
            "Given an array of strings, return their longest common prefix.",
            "Return an empty string if no common prefix exists."
        ],
        input: ["Number of strings", "One string per line"],
        output: ["Longest common prefix"],
        tests: [
            { name: "Common prefix", input: "3\nflower\nflow\nflight", expected: "fl" },
            { name: "No prefix", input: "3\ndog\nracecar\ncar", expected: "" }
        ]
    },
    {
        id: "implement-strstr",
        title: "Find the First Occurrence of a String",
        difficulty: "Easy",
        tags: ["String", "Two Pointers"],
        summary: "Find the first index of a substring in a string.",
        statement: [
            "Given a haystack and a needle, return the first index where needle occurs.",
            "Return -1 if it does not occur. An empty needle returns zero."
        ],
        input: ["Haystack", "Needle"],
        output: ["First matching index"],
        tests: [
            { name: "Match", input: "sadbutsad\nsad", expected: "0" },
            { name: "No match", input: "leetcode\nleeto", expected: "-1" }
        ]
    },
    {
        id: "daily-temperatures",
        title: "Daily Temperatures",
        difficulty: "Medium",
        tags: ["Array", "Stack", "Monotonic Stack"],
        summary: "Find how many days until a warmer temperature.",
        statement: [
            "For each day's temperature, calculate the number of days until a warmer temperature.",
            "Return zero when no warmer day exists."
        ],
        input: ["Array length and temperatures"],
        output: ["Wait-day counts"],
        tests: [
            { name: "Basic", input: "8\n73 74 75 71 69 72 76 73", expected: "1 1 4 2 1 1 0 0" }
        ]
    },
    {
        id: "min-stack",
        title: "Min Stack",
        difficulty: "Medium",
        tags: ["Stack", "Design"],
        summary: "Design a stack that retrieves its minimum in constant time.",
        statement: [
            "Implement push, pop, top, and getMin operations.",
            "Every getMin operation must return the minimum element in O(1) time.",
            "Input commands: push x, pop, top, getMin."
        ],
        input: ["Number of commands", "One command per line"],
        output: ["Result of each top or getMin command"],
        tests: [
            { name: "Basic", input: "6\npush -2\npush 0\npush -3\ngetMin\npop\ntop", expected: "-3\n0" }
        ]
    },
    {
        id: "evaluate-reverse-polish-notation",
        title: "Evaluate Reverse Polish Notation",
        difficulty: "Medium",
        tags: ["Stack", "Math"],
        summary: "Evaluate an arithmetic expression in postfix notation.",
        statement: [
            "Evaluate an expression given in Reverse Polish Notation.",
            "Operators are +, -, *, and /. Division truncates toward zero."
        ],
        input: ["Space-separated tokens"],
        output: ["Integer result"],
        tests: [
            { name: "Basic", input: "2 1 + 3 *", expected: "9" },
            { name: "Negative division", input: "7 -3 /", expected: "-2" }
        ]
    },
    {
        id: "binary-tree-inorder",
        title: "Binary Tree Inorder Traversal",
        difficulty: "Easy",
        tags: ["Tree", "DFS", "Stack"],
        summary: "Return a binary tree's inorder traversal.",
        statement: [
            "Given a binary tree in level-order format, return its inorder traversal.",
            "Use # to represent null nodes."
        ],
        input: ["Level-order tree values separated by spaces"],
        output: ["Inorder values"],
        tests: [
            { name: "Basic", input: "1 # 2 3", expected: "1 3 2" },
            { name: "Empty", input: "#", expected: "" }
        ]
    },
    {
        id: "maximum-depth-binary-tree",
        title: "Maximum Depth of Binary Tree",
        difficulty: "Easy",
        tags: ["Tree", "DFS", "BFS"],
        summary: "Find the maximum depth of a binary tree.",
        statement: [
            "Given a binary tree in level-order format, return its maximum depth.",
            "The empty tree has depth zero."
        ],
        input: ["Level-order tree values separated by spaces"],
        output: ["Maximum depth"],
        tests: [
            { name: "Basic", input: "3 9 20 # # 15 7", expected: "3" },
            { name: "Empty", input: "#", expected: "0" }
        ]
    },
    {
        id: "invert-binary-tree",
        title: "Invert Binary Tree",
        difficulty: "Easy",
        tags: ["Tree", "DFS", "BFS"],
        summary: "Swap the left and right children of every node.",
        statement: [
            "Invert a binary tree by swapping every node's left and right children.",
            "Input and output use level-order format with # for null nodes."
        ],
        input: ["Level-order tree values"],
        output: ["Inverted level-order tree"],
        tests: [
            { name: "Basic", input: "4 2 7 1 3 6 9", expected: "4 7 2 9 6 3 1" }
        ]
    },
    {
        id: "validate-bst",
        title: "Validate Binary Search Tree",
        difficulty: "Medium",
        tags: ["Tree", "DFS", "BST"],
        summary: "Determine whether a binary tree is a valid BST.",
        statement: [
            "Check whether every node satisfies strict BST ordering.",
            "Input uses level-order values with # for null nodes."
        ],
        input: ["Level-order tree values"],
        output: ["true or false"],
        tests: [
            { name: "Valid BST", input: "2 1 3", expected: "true" },
            { name: "Invalid BST", input: "5 1 4 # # 3 6", expected: "false" }
        ]
    },
    {
        id: "kth-smallest-bst",
        title: "Kth Smallest Element in a BST",
        difficulty: "Medium",
        tags: ["Tree", "BST", "DFS"],
        summary: "Find the kth smallest value in a binary search tree.",
        statement: [
            "Given a BST and an integer k, return its kth smallest value.",
            "k is a valid one-based index."
        ],
        input: ["Level-order tree values", "Integer k"],
        output: ["Kth smallest value"],
        tests: [
            { name: "Basic", input: "3 1 4 # 2\n1", expected: "1" },
            { name: "Third smallest", input: "5 3 6 2 4 # # 1\n3", expected: "3" }
        ]
    },
    {
        id: "lowest-common-ancestor",
        title: "Lowest Common Ancestor of a Binary Tree",
        difficulty: "Medium",
        tags: ["Tree", "DFS"],
        summary: "Find the lowest node that is an ancestor of two given nodes.",
        statement: [
            "Given a binary tree and two node values, return their lowest common ancestor.",
            "Both target nodes exist and have unique values."
        ],
        input: ["Level-order tree values", "Two target values"],
        output: ["LCA value"],
        tests: [
            { name: "Different subtrees", input: "3 5 1 6 2 0 8 # # 7 4\n5 1", expected: "3" },
            { name: "Ancestor target", input: "3 5 1 6 2 0 8 # # 7 4\n5 4", expected: "5" }
        ]
    },
    {
        id: "rotting-oranges",
        title: "Rotting Oranges",
        difficulty: "Medium",
        tags: ["Graph", "BFS", "Matrix"],
        summary: "Find the minutes required for all reachable fresh oranges to rot.",
        statement: [
            "In a grid, 0 represents empty, 1 fresh, and 2 rotten oranges.",
            "Each minute, rotten oranges infect adjacent fresh oranges.",
            "Return the minimum minutes needed, or -1 if some fresh oranges remain."
        ],
        input: ["Rows and columns", "Grid values"],
        output: ["Minimum minutes"],
        tests: [
            { name: "Basic", input: "3 3\n2 1 1\n1 1 0\n0 1 1", expected: "4" },
            { name: "Impossible", input: "1 2\n2 1", expected: "1" }
        ]
    },
    {
        id: "flood-fill",
        title: "Flood Fill",
        difficulty: "Easy",
        tags: ["Graph", "DFS", "BFS", "Matrix"],
        summary: "Recolor a connected region in an image.",
        statement: [
            "Starting from a cell, replace its color and the color of all four-directionally connected cells with the same original color.",
            "Output the updated image as a matrix."
        ],
        input: ["Rows and columns", "Image values", "Starting row and column", "New color"],
        output: ["Updated image"],
        tests: [
            { name: "Basic", input: "3 3\n1 1 1\n1 1 0\n1 0 1\n1 1 2", expected: "2 2 2\n2 2 0\n2 0 1" }
        ]
    },
    {
        id: "implement-trie",
        title: "Implement Trie (Prefix Tree)",
        difficulty: "Medium",
        tags: ["Trie", "String", "Design"],
        summary: "Support inserting words, searching, and prefix checks.",
        statement: [
            "Implement insert(word), search(word), and startsWith(prefix).",
            "Input commands: insert word, search word, startsWith prefix."
        ],
        input: ["Number of commands", "One command per line"],
        output: ["Boolean results for search and startsWith"],
        tests: [
            { name: "Basic", input: "5\ninsert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app", expected: "true\nfalse\ntrue" }
        ]
    },
    {
        id: "unique-paths",
        title: "Unique Paths",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Math"],
        summary: "Count paths through an m by n grid moving only right or down.",
        statement: [
            "A robot starts at the top-left of an m by n grid and wants to reach the bottom-right.",
            "It can move only right or down. Return the number of unique paths."
        ],
        input: ["Integers m and n"],
        output: ["Number of unique paths"],
        tests: [
            { name: "Basic", input: "3 7", expected: "28" },
            { name: "Small grid", input: "3 2", expected: "3" }
        ]
    },
    {
        id: "longest-increasing-subsequence",
        title: "Longest Increasing Subsequence",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Binary Search"],
        summary: "Find the length of the longest strictly increasing subsequence.",
        statement: [
            "Given an integer array, return the length of its longest strictly increasing subsequence.",
            "The subsequence does not need to be contiguous."
        ],
        input: ["Array length and elements"],
        output: ["Length of LIS"],
        tests: [
            { name: "Basic", input: "8\n10 9 2 5 3 7 101 18", expected: "4" },
            { name: "Duplicates", input: "4\n7 7 7 7", expected: "1" }
        ]
    },
    {
        id: "partition-equal-subset-sum",
        title: "Partition Equal Subset Sum",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Array"],
        summary: "Determine whether an array can be split into two equal-sum subsets.",
        statement: [
            "Given positive integers, determine whether they can be partitioned into two subsets with equal sums.",
            "Each element must belong to exactly one subset."
        ],
        input: ["Array length and elements"],
        output: ["true or false"],
        tests: [
            { name: "Possible", input: "4\n1 5 11 5", expected: "true" },
            { name: "Impossible", input: "4\n1 2 3 5", expected: "false" }
        ]
    },
    {
        id: "find-duplicate-number",
        title: "Find the Duplicate Number",
        difficulty: "Medium",
        tags: ["Array", "Binary Search", "Fast and Slow Pointers"],
        summary: "Find the duplicate number without modifying the array.",
        statement: ["Given n + 1 integers in the range [1, n], find the duplicate number."],
        input: ["Array length and elements"],
        output: ["Duplicate number"],
        tests: [
            { name: "Basic", input: "5\n1 3 4 2 2", expected: "2" },
            { name: "Repeated", input: "5\n3 1 3 4 2", expected: "3" }
        ]
    },
    {
        id: "permutation-in-string",
        title: "Permutation in String",
        difficulty: "Medium",
        tags: ["String", "Sliding Window", "Hash Map"],
        summary: "Check whether one string contains a permutation of another.",
        statement: ["Return true if s2 contains any permutation of s1."],
        input: ["String s1", "String s2"],
        output: ["true or false"],
        tests: [
            { name: "Contains permutation", input: "ab\neidbaooo", expected: "true" },
            { name: "No permutation", input: "ab\neidboaoo", expected: "false" }
        ]
    },
    {
        id: "search-rotated-sorted-array",
        title: "Search in Rotated Sorted Array",
        difficulty: "Medium",
        tags: ["Array", "Binary Search"],
        summary: "Search for a target in a rotated sorted array.",
        statement: ["Return the index of the target in a rotated sorted array, or -1 if absent."],
        input: ["Array length and elements", "Target"],
        output: ["Target index or -1"],
        tests: [
            { name: "Found", input: "7\n4 5 6 7 0 1 2\n0", expected: "4" },
            { name: "Missing", input: "7\n4 5 6 7 0 1 2\n3", expected: "-1" }
        ]
    },
    {
        id: "search-a-2d-matrix",
        title: "Search a 2D Matrix",
        difficulty: "Medium",
        tags: ["Matrix", "Binary Search"],
        summary: "Search a row-wise and globally sorted matrix.",
        statement: ["Return true if target exists in a matrix whose rows are sorted and each row's first element exceeds the previous row's last element."],
        input: ["Rows and columns", "Matrix values", "Target"],
        output: ["true or false"],
        tests: [
            { name: "Found", input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", expected: "true" },
            { name: "Missing", input: "2 2\n1 3\n5 7\n4", expected: "false" }
        ]
    },
    {
        id: "implement-queue-using-stacks",
        title: "Implement Queue Using Stacks",
        difficulty: "Easy",
        tags: ["Stack", "Queue", "Design"],
        summary: "Implement FIFO queue operations using stacks.",
        statement: ["Support push, pop, peek, and empty commands using stacks."],
        input: ["Number of commands", "One command per line"],
        output: ["Results of pop, peek, and empty commands"],
        tests: [
            { name: "Basic", input: "6\npush 1\npush 2\npeek\npop\nempty\npop", expected: "1\n1\nfalse\n2" }
        ]
    },
    {
        id: "remove-nth-node-from-end",
        title: "Remove Nth Node From End of List",
        difficulty: "Medium",
        tags: ["Linked List", "Two Pointers"],
        summary: "Remove the nth node from the end of a linked list.",
        statement: ["Remove the nth node from the end and output the remaining list."],
        input: ["List length and elements", "n"],
        output: ["Updated list"],
        tests: [
            { name: "Basic", input: "5\n1 2 3 4 5\n2", expected: "1 2 3 5" },
            { name: "Remove head", input: "2\n1 2\n2", expected: "2" }
        ]
    },
    {
        id: "lru-cache",
        title: "LRU Cache",
        difficulty: "Medium",
        tags: ["Hash Map", "Doubly Linked List", "Design"],
        summary: "Build a least-recently-used cache with O(1) operations.",
        statement: ["Implement get(key) and put(key, value). Evict the least recently used key when capacity is exceeded."],
        input: ["Capacity", "Number of commands", "Commands: put key value or get key"],
        output: ["Result of each get command; -1 if absent"],
        tests: [
            { name: "Eviction", input: "2\n5\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2", expected: "1\n-1" }
        ]
    },
    {
        id: "diameter-of-binary-tree",
        title: "Diameter of Binary Tree",
        difficulty: "Easy",
        tags: ["Tree", "DFS"],
        summary: "Find the longest path between any two nodes.",
        statement: ["Return the diameter measured in number of edges."],
        input: ["Level-order tree values; # represents null"],
        output: ["Diameter"],
        tests: [
            { name: "Basic", input: "1 2 3 4 5", expected: "3" },
            { name: "Single node", input: "1", expected: "0" }
        ]
    },
    {
        id: "clone-graph",
        title: "Clone Graph",
        difficulty: "Medium",
        tags: ["Graph", "BFS", "DFS", "Hash Map"],
        summary: "Create a deep copy of an undirected graph.",
        statement: ["Given an undirected graph as an adjacency list, construct its deep copy."],
        input: ["Number of nodes", "One adjacency list per node"],
        output: ["Cloned graph adjacency list"],
        tests: [
            { name: "Connected graph", input: "4\n2 4\n1 3\n2 4\n1 3", expected: "2 4\n1 3\n2 4\n1 3" }
        ]
    },
    {
        id: "word-break",
        title: "Word Break",
        difficulty: "Medium",
        tags: ["String", "Dynamic Programming", "Hash Set"],
        summary: "Check whether a string can be segmented into dictionary words.",
        statement: ["Return true if the entire string can be split into one or more dictionary words."],
        input: ["String", "Dictionary size", "Dictionary words"],
        output: ["true or false"],
        tests: [
            { name: "Possible", input: "leetcode\n2\nleet\ncode", expected: "true" },
            { name: "Impossible", input: "catsandog\n5\ncats\ndog\nsand\nand\ncat", expected: "false" }
        ]
    },
    {
        id: "median-two-sorted-arrays",
        title: "Median of Two Sorted Arrays",
        difficulty: "Hard",
        tags: ["Array", "Binary Search"],
        summary: "Find the median of two sorted arrays in logarithmic time.",
        statement: ["Find the median of two sorted arrays in O(log(m+n)) time."],
        input: ["Length and elements of first array", "Length and elements of second array"],
        output: ["Median"],
        tests: [
            { name: "Odd total", input: "2\n1 3\n1\n2", expected: "2" },
            { name: "Even total", input: "2\n1 2\n2\n3 4", expected: "2.5" }
        ]
    },
    {
        id: "trapping-rain-water",
        title: "Trapping Rain Water",
        difficulty: "Hard",
        tags: ["Array", "Two Pointers", "Stack"],
        summary: "Calculate the amount of water trapped between elevation bars.",
        statement: ["Given non-negative bar heights, return the total trapped water."],
        input: ["Array length and heights"],
        output: ["Trapped water"],
        tests: [
            { name: "Basic", input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", expected: "6" },
            { name: "Descending", input: "5\n5 4 3 2 1", expected: "0" }
        ]
    },
    {
        id: "minimum-window-substring",
        title: "Minimum Window Substring",
        difficulty: "Hard",
        tags: ["String", "Sliding Window", "Hash Map"],
        summary: "Find the smallest substring containing all target characters.",
        statement: ["Return the minimum-length substring of s containing every character of t with the required frequencies, or an empty string."],
        input: ["String s", "String t"],
        output: ["Minimum window"],
        tests: [
            { name: "Basic", input: "ADOBECODEBANC\nABC", expected: "BANC" },
            { name: "No window", input: "a\naa", expected: "" }
        ]
    },
    {
        id: "merge-k-sorted-lists",
        title: "Merge k Sorted Lists",
        difficulty: "Hard",
        tags: ["Linked List", "Heap", "Divide and Conquer"],
        summary: "Merge k sorted linked lists into one sorted list.",
        statement: ["Merge all sorted input lists into one sorted list."],
        input: ["Number of lists, then each list length and its elements"],
        output: ["Merged sorted values"],
        tests: [
            { name: "Three lists", input: "3\n3 1 4 5\n3 1 3 4\n2 2 6", expected: "1 1 2 3 4 4 5 6" },
            { name: "Empty lists", input: "2\n0\n0", expected: "" }
        ]
    },
    {
        id: "reverse-nodes-k-group",
        title: "Reverse Nodes in k-Group",
        difficulty: "Hard",
        tags: ["Linked List", "Recursion"],
        summary: "Reverse linked-list nodes in groups of k.",
        statement: ["Reverse every complete group of k nodes. Leave any incomplete final group unchanged."],
        input: ["List length and elements", "k"],
        output: ["Updated list"],
        tests: [
            { name: "Two groups", input: "6\n1 2 3 4 5 6\n2", expected: "2 1 4 3 6 5" },
            { name: "Incomplete group", input: "5\n1 2 3 4 5\n3", expected: "3 2 1 4 5" }
        ]
    },
    {
        id: "largest-rectangle-histogram",
        title: "Largest Rectangle in Histogram",
        difficulty: "Hard",
        tags: ["Array", "Stack", "Monotonic Stack"],
        summary: "Find the largest rectangle under a histogram.",
        statement: ["Given bar heights, find the maximum rectangular area."],
        input: ["Array length and heights"],
        output: ["Maximum area"],
        tests: [
            { name: "Basic", input: "6\n2 1 5 6 2 3", expected: "10" },
            { name: "Equal heights", input: "4\n2 2 2 2", expected: "8" }
        ]
    },
    {
        id: "sliding-window-maximum",
        title: "Sliding Window Maximum",
        difficulty: "Hard",
        tags: ["Array", "Deque", "Sliding Window"],
        summary: "Find the maximum value in every window of size k.",
        statement: ["Return the maximum value for each contiguous window of size k."],
        input: ["Array length and elements", "k"],
        output: ["Window maximums"],
        tests: [
            { name: "Basic", input: "8\n1 3 -1 -3 5 3 6 7\n3", expected: "3 3 5 5 6 7" }
        ]
    },
    {
        id: "word-ladder",
        title: "Word Ladder",
        difficulty: "Hard",
        tags: ["Graph", "BFS", "Hash Set"],
        summary: "Find the shortest transformation sequence between two words.",
        statement: ["Each transformation changes one letter and must produce a dictionary word. Return the sequence length, including both endpoints, or zero if impossible."],
        input: ["Begin word", "End word", "Dictionary size", "Dictionary words"],
        output: ["Shortest sequence length"],
        tests: [
            { name: "Possible", input: "hit\ncog\n6\nhot\ndot\ndog\nlot\nlog\ncog", expected: "5" },
            { name: "Impossible", input: "hit\ncog\n5\nhot\ndot\ndog\nlot\nlog", expected: "0" }
        ]
    },
    {
        id: "alien-dictionary",
        title: "Alien Dictionary",
        difficulty: "Hard",
        tags: ["Graph", "Topological Sort"],
        summary: "Infer character order from a sorted alien-language dictionary.",
        statement: ["Return a valid character ordering consistent with the sorted words, or an empty string if the ordering is invalid. Multiple valid orders may exist."],
        input: ["Number of words", "One word per line"],
        output: ["One valid character ordering"],
        tests: [
            { name: "Basic", input: "5\nwrt\nwrf\ner\nett\nrftt", expected: "wertf" }
        ]
    },
    {
        id: "critical-connections",
        title: "Critical Connections in a Network",
        difficulty: "Hard",
        tags: ["Graph", "DFS", "Bridges"],
        summary: "Find edges whose removal disconnects an undirected graph.",
        statement: ["Return all bridges in an undirected connected graph. Output each edge with its smaller endpoint first, then sort edges lexicographically."],
        input: ["Number of nodes and edges", "One edge per line"],
        output: ["Bridge edges"],
        tests: [
            { name: "One bridge", input: "4 4\n0 1\n1 2\n2 0\n1 3", expected: "1 3" }
        ]
    },
    {
        id: "serialize-deserialize-binary-tree",
        title: "Serialize and Deserialize Binary Tree",
        difficulty: "Hard",
        tags: ["Tree", "BFS", "DFS", "Design"],
        summary: "Convert a binary tree to a string and reconstruct it.",
        statement: ["Serialize a binary tree using level-order traversal and # for nulls, then deserialize it without losing tree structure."],
        input: ["Level-order tree values"],
        output: ["Canonical level-order serialization"],
        tests: [
            { name: "Basic", input: "1 2 3 # # 4 5", expected: "1 2 3 # # 4 5" },
            { name: "Empty", input: "#", expected: "#" }
        ]
    },
    {
        id: "binary-tree-maximum-path-sum",
        title: "Binary Tree Maximum Path Sum",
        difficulty: "Hard",
        tags: ["Tree", "DFS", "Dynamic Programming"],
        summary: "Find the maximum sum of any non-empty path in a binary tree.",
        statement: ["A path may begin and end at any nodes but must follow parent-child connections. Return the maximum sum."],
        input: ["Level-order tree values; # represents null"],
        output: ["Maximum path sum"],
        tests: [
            { name: "Basic", input: "1 2 3", expected: "6" },
            { name: "Negative values", input: "-10 9 20 # # 15 7", expected: "42" }
        ]
    },
    {
        id: "regular-expression-matching",
        title: "Regular Expression Matching",
        difficulty: "Hard",
        tags: ["String", "Dynamic Programming", "Recursion"],
        summary: "Match a string against a pattern containing dot and star.",
        statement: ["Implement full-string matching where . matches any single character and * matches zero or more occurrences of the preceding element."],
        input: ["String s", "Pattern p"],
        output: ["true or false"],
        tests: [
            { name: "Match", input: "aab\nc*a*b", expected: "true" },
            { name: "No match", input: "mississippi\nmis*is*p*.", expected: "false" }
        ]
    },
    {
        id: "edit-distance",
        title: "Edit Distance",
        difficulty: "Hard",
        tags: ["String", "Dynamic Programming"],
        summary: "Find the minimum edits needed to transform one string into another.",
        statement: ["Return the minimum number of insertions, deletions, and replacements needed to convert word1 into word2."],
        input: ["word1", "word2"],
        output: ["Minimum edit count"],
        tests: [
            { name: "Basic", input: "horse\nros", expected: "3" },
            { name: "Same strings", input: "intention\nintention", expected: "0" }
        ]
    },
    {
        id: "n-queens",
        title: "N-Queens",
        difficulty: "Hard",
        tags: ["Backtracking", "Matrix"],
        summary: "Place n queens on a chessboard so none attack each other.",
        statement: ["Count all distinct valid arrangements of n queens on an n by n chessboard."],
        input: ["Integer n"],
        output: ["Number of solutions"],
        tests: [
            { name: "Four queens", input: "4", expected: "2" },
            { name: "One queen", input: "1", expected: "1" }
        ]
    },
    {
        id: "sudoku-solver",
        title: "Sudoku Solver",
        difficulty: "Hard",
        tags: ["Backtracking", "Matrix"],
        summary: "Solve a valid 9 by 9 Sudoku puzzle.",
        statement: ["Fill empty cells represented by . so every row, column, and 3 by 3 box contains digits 1 through 9 exactly once."],
        input: ["Nine rows, each containing nine characters"],
        output: ["Nine solved rows"],
        tests: [
            { name: "Valid puzzle", input: "53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79", expected: "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179" }
        ]
    },
    {
        id: "longest-valid-parentheses",
        title: "Longest Valid Parentheses",
        difficulty: "Hard",
        tags: ["String", "Stack", "Dynamic Programming"],
        summary: "Find the longest well-formed parentheses substring.",
        statement: ["Return the length of the longest valid contiguous parentheses substring."],
        input: ["Parentheses string"],
        output: ["Maximum length"],
        tests: [
            { name: "Basic", input: ")()())", expected: "4" },
            { name: "Nested", input: "()(())", expected: "6" }
        ]
    },
    {
        id: "substring-concatenation-words",
        title: "Substring with Concatenation of All Words",
        difficulty: "Hard",
        tags: ["String", "Sliding Window", "Hash Map"],
        summary: "Find all starting indices where every word appears consecutively.",
        statement: ["Find all indices where a substring contains every given equal-length word exactly once in any order. Output indices in ascending order."],
        input: ["String s", "Number of words", "One word per line"],
        output: ["Sorted starting indices"],
        tests: [
            { name: "Basic", input: "barfoothefoobarman\n2\nfoo\nbar", expected: "0 9" }
        ]
    },
    {
        id: "maximal-rectangle",
        title: "Maximal Rectangle",
        difficulty: "Hard",
        tags: ["Matrix", "Dynamic Programming", "Stack"],
        summary: "Find the largest all-ones rectangle in a binary matrix.",
        statement: ["Given a binary matrix, return the area of the largest rectangle containing only ones."],
        input: ["Rows and columns", "Binary matrix rows"],
        output: ["Maximum area"],
        tests: [
            { name: "Basic", input: "4 5\n10100\n10111\n11111\n10010", expected: "6" },
            { name: "No ones", input: "2 2\n00\n00", expected: "0" }
        ]
    },
    {
        id: "dijkstra-shortest-path",
        title: "Shortest Path in a Weighted Graph",
        difficulty: "Medium",
        tags: ["Graph", "Heap", "Dijkstra"],
        summary: "Find shortest distances from a source in a non-negative weighted graph.",
        statement: ["Given a directed weighted graph with non-negative weights, return shortest distances from the source. Use -1 for unreachable nodes."],
        input: ["Number of nodes and edges", "One directed edge u v weight per line", "Source node"],
        output: ["Distances in node order"],
        tests: [
            { name: "Basic", input: "5 6\n0 1 2\n0 2 4\n1 2 1\n1 3 7\n2 4 3\n3 4 1\n0", expected: "0 2 3 9 6" }
        ]
    },
    {
        id: "combination-sum",
        title: "Combination Sum",
        difficulty: "Medium",
        tags: ["Backtracking", "Array"],
        summary: "Find unique combinations that sum to a target.",
        statement: ["Given distinct positive candidates, return unique combinations summing to target. Each candidate may be reused unlimited times. Sort numbers within each combination and sort combinations lexicographically."],
        input: ["Candidate count and values", "Target"],
        output: ["One combination per line"],
        tests: [
            { name: "Basic", input: "4\n2 3 6 7\n7", expected: "2 2 3\n7" },
            { name: "No combination", input: "2\n2 4\n3", expected: "" }
        ]
    },
    {
        id: "subsets",
        title: "Subsets",
        difficulty: "Medium",
        tags: ["Array", "Backtracking", "Bit Manipulation"],
        summary: "Generate all subsets of a distinct integer array.",
        statement: ["Return the power set, including the empty subset. Sort each subset and sort subsets by length then lexicographically."],
        input: ["Array length and elements"],
        output: ["One subset per line; empty subset is an empty line"],
        tests: [
            { name: "Two values", input: "2\n1 2", expected: "\n1\n2\n1 2" }
        ]
    },
    {
        id: "permutations",
        title: "Permutations",
        difficulty: "Medium",
        tags: ["Array", "Backtracking"],
        summary: "Generate all permutations of distinct integers.",
        statement: ["Return every permutation. Output each permutation on its own line, sorted lexicographically."],
        input: ["Array length and elements"],
        output: ["One permutation per line"],
        tests: [
            { name: "Three values", input: "3\n1 2 3", expected: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1" }
        ]
    }
]

/* ---------- starter code ---------- */

const header = (p) => [
    `${p.title} (${p.difficulty})`,
    "",
    ...p.statement,
    "",
    "Input:",
    ...p.input.map((l) => `  ${l}`),
    "Output:",
    ...p.output.map((l) => `  ${l}`),
]

const comment = (prefix, lines) =>
    lines.map((l) => (l ? `${prefix} ${l}` : prefix)).join("\n")

const BUILDERS = {
    javascript: (p) =>
        [
            comment("//", header(p)),
            "",
            'const lines = require("fs").readFileSync(0, "utf8").split("\\n")',
            "",
            "// TODO: solve it, then print the answer with console.log(...)",
            "",
        ].join("\n"),

    typescript: (p) =>
        [
            comment("//", header(p)),
            "",
            "// @ts-ignore",
            'const lines: string[] = require("fs").readFileSync(0, "utf8").split("\\n")',
            "",
            "// TODO: solve it, then print the answer with console.log(...)",
            "",
        ].join("\n"),

    python: (p) =>
        [
            comment("#", header(p)),
            "",
            "import sys",
            "",
            'lines = sys.stdin.read().split("\\n")',
            "",
            "# TODO: solve it, then print the answer with print(...)",
            "",
        ].join("\n"),

    java: (p) =>
        [
            comment("//", header(p)),
            "",
            "import java.util.*;",
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        Scanner sc = new Scanner(System.in);",
            "        // TODO: read with sc.nextLine() or sc.nextInt(), then print the answer",
            "    }",
            "}",
            "",
        ].join("\n"),

    cpp: (p) =>
        [
            comment("//", header(p)),
            "",
            "#include <bits/stdc++.h>",
            "using namespace std;",
            "",
            "int main() {",
            "    ios::sync_with_stdio(false);",
            "    cin.tie(nullptr);",
            "",
            "    // TODO: read with cin, then print the answer with cout",
            "    return 0;",
            "}",
            "",
        ].join("\n"),

    go: (p) =>
        [
            comment("//", header(p)),
            "",
            "package main",
            "",
            "import (",
            '\t"bufio"',
            '\t"fmt"',
            '\t"os"',
            ")",
            "",
            "func main() {",
            "\treader := bufio.NewReader(os.Stdin)",
            "\tline, _ := reader.ReadString('\\n')",
            "\t_ = line",
            "",
            "\t// TODO: solve it, then print the answer with fmt.Println(...)",
            "\tfmt.Println()",
            "}",
            "",
        ].join("\n"),
}

export const buildStarter = (language, problem) =>
    (BUILDERS[language] || BUILDERS.javascript)(problem)