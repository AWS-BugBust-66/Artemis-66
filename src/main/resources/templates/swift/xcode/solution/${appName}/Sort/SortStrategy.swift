//
//  SortStrategy.swift
//  ${appName}
//

import Foundation

/*
 Task 2.1:
 Implement the SortStrategy Protocol
*/
public protocol SortStrategy {
    /**
      Sorts a list of Dates.

      - Parameter input: list of Dates
     */
    func performSort(_ input: [Date]) -> [Date]
}

/*
 We added an enum for the different sorting algorithms you should implement to make your life easier
*/

/// Enum for the different available sorting algorithms.
public enum SortAlgorithm: String, CaseIterable {
    case MergeSort = "Merge Sort"
    case BubbleSort = "Bubble Sort"
}
