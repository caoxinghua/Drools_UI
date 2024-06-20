import React, { useState } from 'react';
import axios from 'axios';
import './styles/RuleForm.css';

function RuleForm() {
  const [rules, setRules] = useState([]);
  const [containerName, setContainerName] = useState('');
  const [kieBaseName, setKieBaseName] = useState('');
  const [kiePackageName, setKiePackageName] = useState('');

  const objectTypes = ['Customer', 'Order', 'Product', 'Account', 'Transaction'];
  const operators = [
    '==', '!=', '>', '<', '>=', '<=', 
    'contains', 'not contains', 'matches', 'not matches',
    'memberOf', 'not memberOf', 'soundslike', 'str[startsWith]', 'str[endsWith]',
    'in', 'not in', 'excludes', 'includes'
  ];
  const actionTypes = ['set', 'modify', 'insert', 'delete', 'update', 'retract', 'insertLogical'];
  const functionTypes = ['sum', 'avg', 'min', 'max', 'accumulate', 'collectList', 'collectSet'];

  const addRule = () => {
    const newRule = {
      ruleId: '',
      ruleName: '',
      salience: '',
      agenda: '',
      noLoop: false,
      lockOnActive: false,
      ruleflowGroup: '',
      conditions: [{ 
        factType: '', 
        binding: '',
        property: '', 
        operator: '', 
        value: '',
        valueType: 'literal',
        temporalOperator: '',
        temporalValue: '',
        nestedConditions: []
      }],
      actions: [{ 
        type: '', 
        factType: '', 
        property: '', 
        value: '',
        method: '',
        parameters: []
      }],
      functions: [{ 
        type: '', 
        factType: '', 
        property: '', 
        alias: ''
      }],
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleIndex, field, value) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex][field] = value;
    setRules(updatedRules);
  };

  const addCondition = (ruleIndex, parentConditionIndex = null) => {
    const newCondition = { 
      factType: '', 
      binding: '',
      property: '', 
      operator: '', 
      value: '',
      valueType: 'literal',
      temporalOperator: '',
      temporalValue: '',
      nestedConditions: []
    };

    const updatedRules = [...rules];
    if (parentConditionIndex === null) {
      updatedRules[ruleIndex].conditions.push(newCondition);
    } else {
      updatedRules[ruleIndex].conditions[parentConditionIndex].nestedConditions.push(newCondition);
    }
    setRules(updatedRules);
  };

  const updateCondition = (ruleIndex, conditionIndex, field, value, parentConditionIndex = null) => {
    const updatedRules = [...rules];
    if (parentConditionIndex === null) {
      updatedRules[ruleIndex].conditions[conditionIndex][field] = value;
    } else {
      updatedRules[ruleIndex].conditions[parentConditionIndex].nestedConditions[conditionIndex][field] = value;
    }
    setRules(updatedRules);
  };

  const removeCondition = (ruleIndex, conditionIndex, parentConditionIndex = null) => {
    const updatedRules = [...rules];
    if (parentConditionIndex === null) {
      updatedRules[ruleIndex].conditions.splice(conditionIndex, 1);
    } else {
      updatedRules[ruleIndex].conditions[parentConditionIndex].nestedConditions.splice(conditionIndex, 1);
    }
    setRules(updatedRules);
  };

  const addAction = (ruleIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].actions.push({ 
      type: '', 
      factType: '', 
      property: '', 
      value: '',
      method: '',
      parameters: []
    });
    setRules(updatedRules);
  };

  const updateAction = (ruleIndex, actionIndex, field, value) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].actions[actionIndex][field] = value;
    setRules(updatedRules);
  };

  const removeAction = (ruleIndex, actionIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].actions.splice(actionIndex, 1);
    setRules(updatedRules);
  };

  const addFunction = (ruleIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].functions.push({ 
      type: '', 
      factType: '', 
      property: '', 
      alias: ''
    });
    setRules(updatedRules);
  };

  const updateFunction = (ruleIndex, functionIndex, field, value) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].functions[functionIndex][field] = value;
    setRules(updatedRules);
  };

  const removeFunction = (ruleIndex, functionIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].functions.splice(functionIndex, 1);
    setRules(updatedRules);
  };

  const removeRule = (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const ruleRequests = rules.map((rule) => {
        const { ruleId, ruleName, salience, agenda, noLoop, lockOnActive, ruleflowGroup, conditions, actions, functions } = rule;
        
        const constructCondition = (condition, isNested = false) => {
          let conditionStr = '';
          if (condition.binding) {
            conditionStr += `${condition.binding}: `;
          }
          conditionStr += `${condition.factType}(${condition.property} ${condition.operator} `;
          if (condition.valueType === 'literal') {
            conditionStr += condition.value;
          } else if (condition.valueType === 'variable') {
            conditionStr += `$${condition.value}`;
          }
          conditionStr += ')';
          
          if (condition.temporalOperator) {
            conditionStr += ` ${condition.temporalOperator}[${condition.temporalValue}]`;
          }

          if (condition.nestedConditions.length > 0) {
            conditionStr += ' && (' + condition.nestedConditions.map(nested => constructCondition(nested, true)).join(' && ') + ')';
          }

          return conditionStr;
        };

        const ifCondition = conditions.map(condition => constructCondition(condition)).join(' && ');

        const constructAction = (action) => {
          switch(action.type) {
            case 'set':
              return `${action.factType}.set${action.property.charAt(0).toUpperCase() + action.property.slice(1)}(${action.value});`;
            case 'modify':
              return `modify(${action.factType}) { set${action.property.charAt(0).toUpperCase() + action.property.slice(1)}(${action.value}) }`;
            case 'insert':
              return `insert(new ${action.factType}(${action.property}: ${action.value}));`;
            case 'delete':
            case 'retract':
              return `delete(${action.factType});`;
            case 'update':
              return `update(${action.factType});`;
            case 'insertLogical':
              return `insertLogical(new ${action.factType}(${action.property}: ${action.value}));`;
            default:
              return `${action.factType}.${action.method}(${action.parameters.join(', ')});`;
          }
        };

        const thenCondition = actions.map(constructAction).join('\n');

        const functionDeclarations = functions.map(func => 
          `${func.type}( ${func.factType} : ${func.property} ) as ${func.alias}`
        ).join('\n');

        const ruleAttributes = [
          salience ? `salience ${salience}` : '',
          agenda ? `agenda-group "${agenda}"` : '',
          noLoop ? 'no-loop true' : '',
          lockOnActive ? 'lock-on-active true' : '',
          ruleflowGroup ? `ruleflow-group "${ruleflowGroup}"` : '',
        ].filter(Boolean).join('\n');

        const fullRule = `
          rule "${ruleName}"
          ${ruleAttributes}
          when
            ${ifCondition}
            ${functionDeclarations}
          then
            ${thenCondition}
          end
        `;

        return axios.post('http://localhost:8080/drools/rule/add', {
          ruleId: parseInt(ruleId),
          containerName,
          kieBaseName,
          kiePackageName,
          ruleName,
          ruleContent: fullRule,
        });
      });

      await Promise.all(ruleRequests);
      console.log('Rules added successfully');
      // TODO: Handle success scenario (e.g., display success message, reset form)
    } catch (error) {
      console.error('Error adding rules:', error);
      // TODO: Handle error scenario (e.g., display error message)
    }
  };
  return (
    <div className="rule-form-container">
      <form onSubmit={handleSubmit}>
        <table className="config-table">
          <tbody>
            <tr>
              <td><label htmlFor="containerName">Container Name:</label></td>
              <td>
                <input
                  type="text"
                  id="containerName"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  required
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="kieBaseName">KIE Base Name:</label></td>
              <td>
                <input
                  type="text"
                  id="kieBaseName"
                  value={kieBaseName}
                  onChange={(e) => setKieBaseName(e.target.value)}
                  required
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="kiePackageName">KIE Package Name:</label></td>
              <td>
                <input
                  type="text"
                  id="kiePackageName"
                  value={kiePackageName}
                  onChange={(e) => setKiePackageName(e.target.value)}
                  required
                />
              </td>
            </tr>
          </tbody>
        </table>
  
        {rules && rules.map((rule, ruleIndex) => (
          <div key={ruleIndex} className="rule-container">
            <h3>Rule {ruleIndex + 1}</h3>
            <table className="rule-table">
              <tbody>
                <tr>
                  <td>Rule ID:</td>
                  <td>
                    <input
                      type="text"
                      value={rule.ruleId}
                      onChange={(e) => updateRule(ruleIndex, 'ruleId', e.target.value)}
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <td>Rule Name:</td>
                  <td>
                    <input
                      type="text"
                      value={rule.ruleName}
                      onChange={(e) => updateRule(ruleIndex, 'ruleName', e.target.value)}
                      required
                    />
                  </td>
                </tr>
                <tr>
                    <td>Salience:</td>
                    <td>
                        <input
                        type="number"
                        value={rule.salience}
                        onChange={(e) => updateRule(ruleIndex, 'salience', e.target.value)}
                        />
                    </td>
                    </tr>
                    <tr>
                    <td>Agenda Group:</td>
                    <td>
                        <input
                        type="text"
                        value={rule.agenda}
                        onChange={(e) => updateRule(ruleIndex, 'agenda', e.target.value)}
                        />
                    </td>
                    </tr>
                    <tr>
                    <td>No Loop:</td>
                    <td>
                        <input
                        type="checkbox"
                        checked={rule.noLoop}
                        onChange={(e) => updateRule(ruleIndex, 'noLoop', e.target.checked)}
                        />
                    </td>
                    </tr>
                    <tr>
                    <td>Lock-On-Active:</td>
                    <td>
                        <input
                        type="checkbox"
                        checked={rule.lockOnActive}
                        onChange={(e) => updateRule(ruleIndex, 'lockOnActive', e.target.checked)}
                        />
                    </td>
                    </tr>
                    <tr>
                    <td>Ruleflow Group:</td>
                    <td>
                        <input
                        type="text"
                        value={rule.ruleflowGroup}
                        onChange={(e) => updateRule(ruleIndex, 'ruleflowGroup', e.target.value)}
                        />
                    </td>
                </tr>
              </tbody>
            </table>
  
            <h4>Conditions</h4>
            <table className="conditions-table">
              <thead>
                <tr>
                  <th>Fact Type</th>
                  <th>Property</th>
                  <th>Operator</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rule.conditions && rule.conditions.map((condition, conditionIndex) => (
                  <tr key={conditionIndex}>
                    <td>
                      <select
                        value={condition.factType}
                        onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'factType', e.target.value)}
                        required
                      >
                        <option value="">Select Fact Type</option>
                        {objectTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={condition.property}
                        onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'property', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'operator', e.target.value)}
                        required
                      >
                        <option value="">Select Operator</option>
                        {operators.map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'value', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => removeCondition(ruleIndex, conditionIndex)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={() => addCondition(ruleIndex)}>Add Condition</button>
  
        <h4>Actions</h4>
        <table className="actions-table">
          <thead>
            <tr>
              <th>Action Type</th>
              <th>Fact Type</th>
              <th>Property</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rule.actions && rule.actions.map((action, actionIndex) => (
              <tr key={actionIndex}>
                <td>
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(ruleIndex, actionIndex, 'type', e.target.value)}
                    required
                  >
                    <option value="">Select Action Type</option>
                    {actionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={action.factType}
                    onChange={(e) => updateAction(ruleIndex, actionIndex, 'factType', e.target.value)}
                    required
                  >
                    <option value="">Select Fact Type</option>
                    {objectTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={action.property}
                    onChange={(e) => updateAction(ruleIndex, actionIndex, 'property', e.target.value)}
                    required
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={action.value}
                    onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                    required
                  />
                </td>
                <td>
                  <button type="button" onClick={() => removeAction(ruleIndex, actionIndex)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => addAction(ruleIndex)}>Add Action</button>

        <h4>Functions</h4>
        <table className="functions-table">
          <thead>
            <tr>
              <th>Function Type</th>
              <th>Fact Type</th>
              <th>Property</th>
              <th>Alias</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rule.functions && rule.functions.map((func, functionIndex) => (
              <tr key={functionIndex}>
                <td>
                  <select
                    value={func.type}
                    onChange={(e) => updateFunction(ruleIndex, functionIndex, 'type', e.target.value)}
                    required
                  >
                    <option value="">Select Function Type</option>
                    {functionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={func.factType}
                    onChange={(e) => updateFunction(ruleIndex, functionIndex, 'factType', e.target.value)}
                    required
                  >
                    <option value="">Select Fact Type</option>
                    {objectTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={func.property}
                    onChange={(e) => updateFunction(ruleIndex, functionIndex, 'property', e.target.value)}
                    required
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={func.alias}
                    onChange={(e) => updateFunction(ruleIndex, functionIndex, 'alias', e.target.value)}
                    required
                  />
                </td>
                <td>
                  <button type="button" onClick={() => removeFunction(ruleIndex, functionIndex)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => addFunction(ruleIndex)}>Add Function</button>
                    <button type="button" onClick={() => removeRule(ruleIndex)}>Remove Rule</button>
                  </div>
                ))}
  
        <button type="button" onClick={addRule}>Add Rule</button>
  
        <div className="form-group">
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
}



  

  export default RuleForm;