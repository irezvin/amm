/* global Amm */

Amm.Table = {
    
    /**
     * `mode` argument for Amm.Table.Row.findAdjacent() 
     * and Amm.Table.Cell.findAdjacent() 
     * - means search is done within same section
     * 
     * @type Number
     */
    ADJACENT_SAME_SECTION: 0,
    
    /**
     * `mode` argument for Amm.Table.Row.findAdjacent() 
     * and Amm.Table.Cell.findAdjacent() 
     * - means search is done within item rows
     * 
     * @type Number
     */
    ADJACENT_ITEM_ROW: 1,
    
    /**
     * `mode` argument for Amm.Table.Row.findAdjacent() 
     * and Amm.Table.Cell.findAdjacent() 
     * - means search is done within all sections of table
     * 
     * @type Number
     */
    ADJACENT_ANY_SECTION: 2,
    
    /**
     * `mode` argument for Amm.Table.Cell.findAdjacent() 
     * - means search is done within same row
     * 
     * @type Number
     */
    ADJACENT_SAME_ROW: 4,
    
};
